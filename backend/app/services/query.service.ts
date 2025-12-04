// app/services/query.service.ts
import {
  AnalysisResult,
  DatasetRow,
  QueryRequestBody,
  SuggestedChart,
  // 🔹 NEW: multi-dataset payload type
  DatasetPayload,
} from "../types/query";
import { callLLM } from "./llm.service";

interface HandleUserQueryInput extends QueryRequestBody {
  // For backward compatibility: controller currently passes these
  dataset: DatasetRow[];
  columns: string[];
}

/**
 * System prompt: define style and behavior once.
 */
const SYSTEM_PROMPT = `
You are NovaProwl's senior data analyst.

Your job:
- Read the user's question.
- Use the dataset snapshot you receive.
- Answer in **clean, well-structured GitHub-Flavoured Markdown**,
  similar to how ChatGPT would explain things.

Style requirements:
- Use clear section headings with "##" and "###".
- Put a blank line before and after each heading.
- Use bullet lists where it helps readability.
- Use short paragraphs (2–4 sentences).
- Include at least ONE markdown table when it makes sense.
- Tables must use pipes and header rows, for example:

  | Metric | Value / Description |
  | ------ | ------------------- |
  | Total Revenue | Rough description or approximate value |
  | Total Profit  | Rough description or approximate value |

- You may use emojis sparingly (for emphasis or friendliness), but do NOT overuse them.
- You may describe totals or averages roughly; do not hallucinate very precise numbers
  unless they are clearly inferable from the sample rows.

Very important:
- **Always focus on the user's prompt.**
  - If they ask about trends, talk about trends.
  - If they ask about outliers, talk about outliers.
  - If they ask for suggestions, focus on recommendations.
- You can briefly mention a high-level overview of the dataset once, but do NOT
  repeat the same generic introduction for every answer.
`;

/* ------------------------------------------------------------------
 * 🔹 HELPER: resolve active dataset (works for single & multi)
 * ------------------------------------------------------------------ */
function resolveActiveDataset(input: HandleUserQueryInput) {
  const multi = input.datasets as DatasetPayload[] | undefined;

  if (multi && multi.length > 0) {
    const activeId = input.activeDatasetId || multi[0].id;
    const active =
      multi.find((d) => d.id === activeId) ?? multi[0];

    const activeRows: DatasetRow[] = active.rows ?? [];
    const activeColumns: string[] = active.columns ?? [];

    const allDatasetsSummary = multi
      .map((d) => {
        const rowCount = d.rows?.length ?? 0;
        const colCount = d.columns?.length ?? 0;
        return `- ${d.name} (id: ${d.id}) – ${rowCount} rows, ${colCount} columns`;
      })
      .join("\n");

    return {
      activeId: active.id,
      activeName: active.name,
      activeRows,
      activeColumns,
      allDatasetsSummary,
    };
  }

  // 🔙 Fallback: legacy single-dataset mode
  const rows = input.dataset ?? [];
  const cols =
    input.columns && input.columns.length > 0
      ? input.columns
      : rows.length > 0
      ? Object.keys(rows[0])
      : [];

  const rowCount = rows.length;
  const colCount = cols.length;

  const nameFromContext =
    (input.context as any)?.fileName ||
    "Dataset";

  const allDatasetsSummary = `- ${nameFromContext} – ${rowCount} rows, ${colCount} columns`;

  return {
    activeId: undefined as string | undefined,
    activeName: nameFromContext as string,
    activeRows: rows,
    activeColumns: cols,
    allDatasetsSummary,
  };
}

/**
 * Build the concrete user prompt for the LLM:
 * includes question, ALL datasets summary and sample rows of ACTIVE dataset.
 */
function buildAnswerPrompt(input: HandleUserQueryInput): string {
  const { prompt, dataset, columns, datasets, activeDatasetId, context } = input;

  const hasMulti = datasets && datasets.length > 0;

  let datasetsSection = "";

  if (hasMulti) {
    datasetsSection =
      "We have multiple datasets loaded in this session.\n\n" +
      datasets
        .map((ds, idx) => {
          const rowCount = ds.rows?.length ?? 0;
          const sampleRows = ds.rows.slice(0, 5);
          return [
            `### Dataset ${idx + 1}: ${ds.fileName} (id: ${ds.id})`,
            `- Rows: ${rowCount}`,
            `- Columns: ${ds.columns.length ? ds.columns.join(", ") : "none"}`,
            "",
            "Sample rows:",
            "```json",
            JSON.stringify(sampleRows, null, 2),
            "```",
            "",
          ].join("\n");
        })
        .join("\n");
  } else {
    const rowCount = dataset?.length ?? 0;
    const sampleRows = dataset.slice(0, 5);
    datasetsSection = [
      "Single dataset overview:",
      `- Rows: ${rowCount}`,
      `- Columns: ${columns.length ? columns.join(", ") : "none"}`,
      "",
      "Sample rows:",
      "```json",
      JSON.stringify(sampleRows, null, 2),
      "```",
      "",
    ].join("\n");
  }

  return [
    `User question:`,
    prompt || "(no explicit question provided)",
    "",
    hasMulti
      ? `Active dataset in UI: ${activeDatasetId || "not specified"}`
      : "",
    "",
    datasetsSection,
    "",
    "Optional context (if any):",
    "```json",
    JSON.stringify(context || {}, null, 2),
    "```",
    "",
    "Instructions:",
    "- You may use one or more datasets depending on the question.",
    "- If the user explicitly mentions multiple files/datasets, compare or join them when appropriate.",
    "- Clearly mention which dataset(s) your insights come from.",
  ].join("\n");
}

/* ------------------------------------------------------------------
 * 🔹 HELPER: detect numeric columns from a dataset
 * ------------------------------------------------------------------ */
function getNumericColumnsForInference(
  dataset: DatasetRow[],
  columns: string[]
): string[] {
  if (!dataset.length) return [];
  return columns.filter((col) =>
    dataset.some((row) => {
      const v = (row as any)[col];
      if (typeof v === "number") return true;
      const n = Number(v);
      return !Number.isNaN(n) && v !== "" && v !== null && v !== undefined;
    })
  );
}

/* ------------------------------------------------------------------
 * 🔹 HELPER: infer chart config from the user prompt
 *      - Now uses the ACTIVE dataset resolved above
 *      - Tags chart with datasetId when available
 * ------------------------------------------------------------------ */
function inferChartsFromPrompt(
  input: HandleUserQueryInput
): SuggestedChart[] {
  const { prompt = "" } = input;
  const lower = prompt.toLowerCase();

  // Only try to infer a chart if user clearly mentions a chart/graph/plot
  const wantsChart = [
    "chart",
    "graph",
    "plot",
    "visualise",
    "visualize",
    "visualization",
    "visualisation",
  ].some((word) => lower.includes(word));

  if (!wantsChart) return [];

  const {
    activeId,
    activeRows,
    activeColumns,
  } = resolveActiveDataset(input);

  if (!activeColumns.length || !activeRows.length) return [];

  const numericCols = getNumericColumnsForInference(activeRows, activeColumns);
  const categoricalCols = activeColumns.filter(
    (c) => !numericCols.includes(c)
  );

  // if we still can't find sensible columns, bail out
  if (!numericCols.length || !categoricalCols.length) return [];

  // Decide chart type based on keywords (very simple heuristic)
  let chartType: SuggestedChart["type"] = "bar";
  if (lower.includes("line")) chartType = "line";
  else if (lower.includes("pie")) chartType = "pie";
  else if (lower.includes("donut") || lower.includes("doughnut"))
    chartType = "donut";
  else if (lower.includes("scatter")) chartType = "scatter";
  else if (lower.includes("area")) chartType = "area";
  else if (lower.includes("heatmap")) chartType = "heatmap";

  // Try to parse a "X by Y" pattern: e.g. "profit by trader"
  let xField = categoricalCols[0];
  let yField: string | undefined = numericCols[0];

  const byIndex = lower.indexOf(" by ");
  if (byIndex !== -1) {
    const left = lower.slice(0, byIndex).trim();
    const right = lower.slice(byIndex + 4).trim();

    // Match right side to a column (dimension)
    const matchedDim = activeColumns.find(
      (col) =>
        right.includes(col.toLowerCase()) ||
        col.toLowerCase().includes(right)
    );
    if (matchedDim) {
      xField = matchedDim;
    }

    // Match left side to a numeric column (metric)
    const matchedMetric = numericCols.find(
      (col) =>
        left.includes(col.toLowerCase()) ||
        col.toLowerCase().includes(left)
    );
    if (matchedMetric) {
      yField = matchedMetric;
    }
  }

  // Fallbacks if we somehow lost them
  if (!xField) xField = activeColumns[0];
  if (!yField) yField = numericCols[0];

  // Decide aggregation: default to sum for metrics like revenue, profit, value
  let agg: SuggestedChart["agg"] = "sum";
  if (lower.includes("average") || lower.includes("avg") || lower.includes("mean")) {
    agg = "avg";
  } else if (lower.includes("count")) {
    agg = "count";
  }

  const titleBase =
    prompt.trim().length > 0 ? prompt.trim() : `Chart of ${yField} by ${xField}`;

  const suggested: SuggestedChart = {
    id: `ai-chart-${Date.now()}`,
    title: titleBase,
    type: chartType,
    xField,
    yField,
    agg,
    description: `Auto-generated from prompt: "${prompt}"`,
    // 🔹 IMPORTANT: tie chart to the active dataset so frontend knows which one
    datasetId: activeId,
  };

  return [suggested];
}

/**
 * Main handler used by the query controller.
 * Returns AnalysisResult expected by the frontend.
 *
 * NOTE: still accepts HandleUserQueryInput (with dataset + columns required),
 * but also understands multi-dataset via `datasets` + `activeDatasetId`.
 */
export async function handleUserQuery(
  input: HandleUserQueryInput
): Promise<AnalysisResult> {
  const userPrompt = buildAnswerPrompt(input);

  const answerMarkdown = await callLLM([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ]);

  // 🔹 NEW: infer charts from ACTIVE dataset
  const inferredCharts = inferChartsFromPrompt(input);

  const result: AnalysisResult = {
    summary: answerMarkdown,
    insights: [],
    kpis: [],
    charts: inferredCharts,
    followUpQuestions: [],
    rawText: answerMarkdown,
  };

  return result;
}