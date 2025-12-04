// app/types/query.ts

// ---------------------------------------------
// Generic row coming from the frontend dataset
// ---------------------------------------------
export type DatasetRow = Record<string, unknown>;

// ---------------------------------------------
// Aggregations supported for charts / KPIs
// ---------------------------------------------
export type AggregationType = "sum" | "avg" | "count" | "min" | "max";

// ---------------------------------------------
// All chart types NovaProwl can render
// ---------------------------------------------
export type ChartType =
  | "bar"
  | "line"
  | "pie"
  | "donut"
  | "scatter"
  | "area"
  | "heatmap"
  | "funnel"
  | "sunburst";

// ---------------------------------------------
// Multi-dataset payload (NEW)
// ---------------------------------------------
export interface DatasetPayload {
  id: string;                  // unique id per dataset (frontend decides)
  name: string;                // e.g. "Sales Q1", "Marketing Leads"
  columns: string[];           // column names
  rows: DatasetRow[];          // raw records
}

// ---------------------------------------------
// Suggested chart from the backend
// ---------------------------------------------
export interface SuggestedChart {
  id?: string;
  title: string;
  type: ChartType;
  xField: string;          // column name used on x-axis / category
  yField?: string;         // may be omitted for pie/sunburst
  agg?: AggregationType;   // how to aggregate numeric column
  description?: string;    // short explanation for UI

  // 🔹 NEW: which dataset this chart belongs to
  // If omitted, frontend can assume "activeDatasetId"
  datasetId?: string;
}

// ---------------------------------------------
// KPI formats
// ---------------------------------------------
export type KPIFormat =
  | "number"
  | "currency"
  | "percentage"
  | "duration"
  | "custom";

// ---------------------------------------------
// Suggested KPI from the backend
// ---------------------------------------------
export interface SuggestedKPI {
  id?: string;
  label: string;
  value: number;
  format?: KPIFormat;
  unit?: string;           // e.g. "₹", "hrs", "%"
  trend?: string;          // e.g. "+4.2%", "stable", "down"
  description?: string;    // short explanation for tooltip / detail
}

// ---------------------------------------------
// Final object returned by handleUserQuery
// ---------------------------------------------
// summary        → natural markdown summary (from 2nd LLM call)
// insights       → bullets/strings for extra callouts
// kpis           → KPI cards the frontend can render
// charts         → chart configs the DashboardSection can render
// followUpQuestions → suggested prompts for user
// rawText        → raw structured JSON / debugging text (optional UI usage)
// ---------------------------------------------
export interface AnalysisResult {
  summary: string;              // markdown / rich text
  insights?: string[];
  kpis?: SuggestedKPI[];
  charts?: SuggestedChart[];
  followUpQuestions?: string[];
  rawText?: string;
}

// ---------------------------------------------
// Shape of POST /api/query request body
// ---------------------------------------------
export interface QueryRequestBody {
  // 🔹 User's natural language prompt
  prompt: string;


  // 🔹 OLD single-dataset shape (kept for backward compatibility)
  dataset?: DatasetRow[];
  columns?: string[];
  context?: Record<string, unknown>;

  // 🔹 NEW multi-dataset shape
  // When provided, backend should use these instead of `dataset`/`columns`
  datasets?: DatasetPayload[];

  // Id of currently "selected" dataset in the UI (for charts / KPIs)
  activeDatasetId?: string;
}