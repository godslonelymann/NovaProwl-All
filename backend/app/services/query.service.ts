import {
  AnalysisResult,
  DatasetRow,
  SuggestedChart,
  SuggestedKPI,
  QueryRequestBody,
} from "../types/query";
import { callLLM } from "./llm.service";

interface HandleUserQueryInput extends QueryRequestBody {
  dataset: DatasetRow[];
  columns: string[];
}

function buildSystemPrompt(): string {
  return `
You are NovaProwl's data assistant.

Your job:
- Read the user prompt.
- Use the dataset metadata they send.
- Return ONE clean JSON object with analysis instructions for the frontend.

You NEVER:
- Return Markdown outside JSON.
- Add explanations outside JSON.
- Use backticks, code fences, or prose.

You ALWAYS:
- Return VALID JSON only.
- Follow the exact schema below.

JSON schema (informal):

{
  "summary": string,                   // conversational markdown summary the UI will show at top
  "insights": string[],                // list of key insights
  "kpis": [                            // KPIs suggested for KPI cards
    {
      "id": string,                    // optional, can be null - frontend can override
      "label": string,
      "value": number,
      "format": "number" | "currency" | "percentage" | "duration" | "custom",
      "unit": string | null,
      "trend": string | null,          // eg "+4.2%" or "stable"
      "description": string | null
    }
  ],
  "charts": [
    {
      "id": string,
      "title": string,
      "type": "bar" | "line" | "pie" | "donut" | "scatter" | "area" | "heatmap" | "funnel" | "sunburst",
      "xField": string,                // column name for x axis / category
      "yField": string | null,         // optional for pie/sunburst
      "agg": "sum" | "avg" | "count" | "min" | "max" | null,
      "description": string | null
    }
  ],
  "followUpQuestions": string[],       // suggested prompts for the user
  "rawText": string                    // OPTIONAL: if you want to include a free-form explanation
}

IMPORTANT:
- Only suggest KPIs and charts that make sense with the given columns & prompt.
- If you are unsure or data is missing, leave arrays empty rather than guessing wildly.
- Do NOT repeat the whole dataset; just reference columns by name.
`;
}

function buildUserPrompt(input: HandleUserQueryInput): string {
  const { prompt, dataset, columns, context } = input;

  const exampleRow =
    dataset && dataset.length > 0
      ? JSON.stringify(dataset[0], null, 2)
      : "No rows provided.";

  const rowCount = dataset?.length ?? 0;

  return `
User prompt:
${prompt}

Dataset overview:
- Number of rows: ${rowCount}
- Columns: ${columns.join(", ") || "none"}

Example row:
${exampleRow}

Optional context:
${JSON.stringify(context || {}, null, 2)}

Now, return ONE JSON object following the schema described by the system message.
`;
}

function safeParseJSON(content: string): any {
  try {
    return JSON.parse(content);
  } catch {
    // try to salvage JSON if model wrapped in code fences
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // ignore
      }
    }
    return null;
  }
}

export async function handleUserQuery(
  input: HandleUserQueryInput
): Promise<AnalysisResult> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(input);

  const raw = await callLLM([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  const parsed = safeParseJSON(raw);

  if (!parsed || typeof parsed !== "object") {
    // Fallback: treat the whole response as a plain summary
    return {
      summary: raw,
      insights: [],
      kpis: [],
      charts: [],
      followUpQuestions: [],
      rawText: raw,
    };
  }

  const result: AnalysisResult = {
    summary: typeof parsed.summary === "string" ? parsed.summary : raw,
    insights: Array.isArray(parsed.insights)
      ? parsed.insights.filter((x: unknown) => typeof x === "string")
      : [],
    kpis: Array.isArray(parsed.kpis)
      ? parsed.kpis.filter((k: SuggestedKPI) => !!k && typeof k.label === "string")
      : [],
    charts: Array.isArray(parsed.charts)
      ? parsed.charts.filter(
          (c: SuggestedChart) =>
            !!c && typeof c.title === "string" && typeof c.type === "string"
        )
      : [],
    followUpQuestions: Array.isArray(parsed.followUpQuestions)
      ? parsed.followUpQuestions.filter((x: unknown) => typeof x === "string")
      : [],
    rawText: typeof parsed.rawText === "string" ? parsed.rawText : raw,
  };

  return result;
}