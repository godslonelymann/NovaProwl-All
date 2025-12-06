// app/services/query.service.ts
import {
  AnalysisResult,
  DatasetRow,
  SuggestedChart,
  QueryDatasetPayload,
} from "../types/query";
import { callLLM } from "./llm.service";

interface HandleUserQueryInput {
  prompt: string;
  datasets: QueryDatasetPayload[];
  activeDatasetId?: string;
  context?: Record<string, unknown>;
  // Legacy fallbacks
  dataset?: DatasetRow[];
  columns?: string[];
}

/**
 * System prompt: define style and behavior once.
 */
const SYSTEM_PROMPT = `
You are NovaProwl's senior data analyst.

Your job:
- Read the user's question.
- Use the dataset snapshot(s) you receive.
- Answer in **clean, well-structured GitHub-Flavoured Markdown**.

Style requirements:
- Use clear section headings with "##" and "###".
- Put a blank line before and after each heading.
- Use bullet lists where it helps readability.
- Use short paragraphs (2–4 sentences).
- Include at least ONE markdown table when it makes sense.

Very important:
- **Always focus on the user's prompt.**
- If multiple datasets are provided, clearly state which dataset(s) you are using in each part of your explanation (by file name or id).
- Prefer the ACTIVE dataset for KPIs and charts unless the question requires multiple datasets.
- When the question implies comparisons/joins/correlations, use ALL relevant datasets and explain the linkage (common columns, matching ids, time alignment, or inferred joins).
- If suggesting charts, mention which dataset(s) the axes come from.`;

/**
 * Build the concrete user prompt for the LLM:
 * includes question, all dataset info and a few sample rows.
 */
function buildAnswerPrompt(input: HandleUserQueryInput): string {
  const { prompt, datasets, activeDatasetId, context, dataset, columns } = input;

  const datasetsToDescribe = datasets && datasets.length ? datasets : [];

  const commonColumns = findCommonColumns(datasetsToDescribe);
  const correlationHints =
    commonColumns.length > 0
      ? [
          "",
          "Detected common columns across datasets (potential join keys):",
          commonColumns.map((c) => `- ${c}`).join("\n"),
          "",
        ].join("\n")
      : "";

  const datasetsSection = datasetsToDescribe
    .map((ds, idx) => {
      const rowCount = ds.rows?.length ?? 0;
      const sampleRows = (ds.rows || []).slice(0, 5);
      return [
        `### Dataset ${idx + 1}: ${ds.fileName} (id: ${ds.id}${
          ds.extension ? `, ext: ${ds.extension}` : ""
        })`,
        `- Rows: ${rowCount}`,
        `- Columns: ${
          ds.columns && ds.columns.length ? ds.columns.join(", ") : "none"
        }`,
        "",
        "Sample rows (up to 5):",
        "```json",
        JSON.stringify(sampleRows, null, 2),
        "```",
        "",
      ].join("\n");
    })
    .join("\n");

  const legacySection =
    !datasetsToDescribe.length && dataset && columns
      ? [
          "### Legacy dataset (single):",
          `- Rows: ${dataset.length}`,
          `- Columns: ${columns.length ? columns.join(", ") : "none"}`,
          "",
          "Sample rows (up to 5):",
          "```json",
          JSON.stringify(dataset.slice(0, 5), null, 2),
          "```",
          "",
        ].join("\n")
      : "";

  return [
    `User question:`,
    prompt || "(no explicit question provided)",
    "",
    datasetsToDescribe.length
      ? `Active dataset in UI: ${activeDatasetId || "not specified"}`
      : "",
    "",
    datasetsSection || legacySection,
    correlationHints,
    "",
    "Optional context (if any):",
    "```json",
    JSON.stringify(context || {}, null, 2),
    "```",
    "",
    "Instructions:",
    "- You may use one or more datasets depending on the question.",
    "- Use the active dataset primarily for KPIs/charts; optionally cross-reference others for comparisons/correlations.",
    "- If the user explicitly mentions multiple files/datasets, compare or relate them.",
    "- Clearly mention which dataset(s) your insights come from (by file name or id).",
  ].join("\n");
}

/* ------------------------------------------------------------------
 * detect numeric columns from the dataset
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

function findCommonColumns(datasets: QueryDatasetPayload[]): string[] {
  if (!datasets || datasets.length < 2) return [];
  const columnSets = datasets.map((ds) => new Set(ds.columns || []));
  const [first, ...rest] = columnSets;
  const commons: string[] = [];
  first.forEach((col) => {
    if (rest.every((set) => set.has(col))) commons.push(col);
  });
  return commons;
}

function getNumericColumns(dataset: QueryDatasetPayload): string[] {
  const cols = dataset.columns || [];
  return cols.filter((col) =>
    dataset.rows.some((row) => {
      const v = (row as any)[col];
      if (typeof v === "number") return true;
      const n = Number(v);
      return !Number.isNaN(n) && v !== "" && v !== null && v !== undefined;
    })
  );
}

/* ------------------------------------------------------------------
 * pick dataset + columns for chart inference (active dataset priority)
 * ------------------------------------------------------------------ */
function getDatasetForCharts(
  input: HandleUserQueryInput
): { rows: DatasetRow[]; columns: string[] } {
  if (input.datasets && input.datasets.length) {
    const active =
      input.datasets.find((ds) => ds.id === input.activeDatasetId) ||
      input.datasets[0];
    return {
      rows: active?.rows || [],
      columns: active?.columns || [],
    };
  }

  return {
    rows: input.dataset || [],
    columns: input.columns || [],
  };
}

/* ------------------------------------------------------------------
 * infer chart config from the user prompt (single active dataset)
 * ------------------------------------------------------------------ */
function inferChartsFromPrompt(
  input: HandleUserQueryInput
): SuggestedChart[] {
  const { prompt = "" } = input;
  const { rows: dataset, columns } = getDatasetForCharts(input);

  const lower = prompt.toLowerCase();

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
  if (!columns.length || !dataset.length) return [];

  const numericCols = getNumericColumnsForInference(dataset, columns);
  const categoricalCols = columns.filter(
    (c) => !numericCols.includes(c)
  );

  if (!numericCols.length || !categoricalCols.length) return [];

  let chartType: SuggestedChart["type"] = "bar";
  if (lower.includes("line")) chartType = "line";
  else if (lower.includes("pie")) chartType = "pie";
  else if (lower.includes("donut") || lower.includes("doughnut"))
    chartType = "donut";
  else if (lower.includes("scatter")) chartType = "scatter";
  else if (lower.includes("area")) chartType = "area";
  else if (lower.includes("heatmap")) chartType = "heatmap";

  let xField = categoricalCols[0];
  let yField: string | undefined = numericCols[0];

  const byIndex = lower.indexOf(" by ");
  if (byIndex !== -1) {
    const left = lower.slice(0, byIndex).trim();
    const right = lower.slice(byIndex + 4).trim();

    const matchedDim = columns.find(
      (col) =>
        right.includes(col.toLowerCase()) ||
        col.toLowerCase().includes(right)
    );
    if (matchedDim) xField = matchedDim;

    const matchedMetric = numericCols.find(
      (col) =>
        left.includes(col.toLowerCase()) ||
        col.toLowerCase().includes(left)
    );
    if (matchedMetric) yField = matchedMetric;
  }

  if (!xField) xField = columns[0];
  if (!yField) yField = numericCols[0];

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
  };

  return [suggested];
}

function inferCrossDatasetCharts(
  input: HandleUserQueryInput
): SuggestedChart[] {
  const { prompt = "", datasets } = input;
  if (!datasets || datasets.length < 2) return [];
  const lower = prompt.toLowerCase();
  const wantsCompare = ["compare", "versus", "vs", "correlat", "relationship"].some(
    (word) => lower.includes(word)
  );
  if (!wantsCompare) return [];

  const commons = findCommonColumns(datasets);
  const charts: SuggestedChart[] = [];

  // pick first two datasets with any numeric columns
  const withNumeric = datasets.filter((ds) => getNumericColumns(ds).length);
  if (withNumeric.length < 2) return charts;

  const dsA = withNumeric[0];
  const dsB = withNumeric[1];
  const numA = getNumericColumns(dsA)[0];
  const numB = getNumericColumns(dsB)[0];
  const joinKey = commons[0] || dsA.columns[0] || dsB.columns[0];

  if (numA && numB) {
    charts.push({
      id: `multi-chart-${Date.now()}`,
      title: `Compare ${numA} (${dsA.fileName}) vs ${numB} (${dsB.fileName})`,
      type: "scatter",
      xField: `${dsA.fileName}:${numA}${joinKey ? ` by ${joinKey}` : ""}`,
      yField: `${dsB.fileName}:${numB}`,
      description: `Cross-dataset comparison using ${
        joinKey ? `join on ${joinKey}` : "aligned order"
      }.`,
    });
  }

  return charts;
}

/**
 * Main handler used by the query controller.
 */
export async function handleUserQuery(
  input: HandleUserQueryInput
): Promise<AnalysisResult> {
  const userPrompt = buildAnswerPrompt(input);

  const answerMarkdown = await callLLM([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ]);

  const inferredCharts = inferChartsFromPrompt({
    ...input,
    // ensure we pass a concrete dataset & columns for chart inference
    dataset: input.dataset,
    columns: input.columns,
  });
  const crossDatasetCharts = inferCrossDatasetCharts(input);

  const result: AnalysisResult = {
    summary: answerMarkdown,
    insights: [],
    kpis: [],
    charts: [...inferredCharts, ...crossDatasetCharts],
    followUpQuestions: [],
    rawText: answerMarkdown,
  };

  return result;
}
