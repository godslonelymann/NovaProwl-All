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
export interface AnalysisResult {
  summary: string;              // markdown / rich text
  insights?: string[];
  kpis?: SuggestedKPI[];
  charts?: SuggestedChart[];
  followUpQuestions?: string[];
  rawText?: string;
}

// ---------------------------------------------
// Multi-dataset payload coming from frontend
// ---------------------------------------------
export interface FrontendDatasetPayload {
  id: string;              // same id as in your pills
  fileName: string;
  rows: DatasetRow[];
  columns: string[];
}

// ---------------------------------------------
// Shape of POST /api/query request body
// ---------------------------------------------
export interface QueryRequestBody {
  prompt: string;

  // 🧠 Multi-dataset (preferred)
  datasets?: FrontendDatasetPayload[];

  // which dataset is currently selected in the UI
  activeDatasetId?: string;

  // 🔙 legacy single-dataset fields (kept for compat)
  dataset?: DatasetRow[];
  columns?: string[];

  context?: Record<string, unknown>;
}