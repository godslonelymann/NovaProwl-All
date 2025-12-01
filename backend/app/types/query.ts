// Generic row from the frontend dataset
export type DatasetRow = Record<string, unknown>;

export type AggregationType = "sum" | "avg" | "count" | "min" | "max";

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

export interface SuggestedChart {
  id?: string;
  title: string;
  type: ChartType;
  xField: string;
  yField?: string;
  agg?: AggregationType;
  description?: string;
}

export type KPIFormat =
  | "number"
  | "currency"
  | "percentage"
  | "duration"
  | "custom";

export interface SuggestedKPI {
  id?: string;
  label: string;
  value: number;
  format?: KPIFormat;
  unit?: string;
  trend?: string;
  description?: string;
}

export interface AnalysisResult {
  summary: string; // markdown / rich text
  insights?: string[];
  kpis?: SuggestedKPI[];
  charts?: SuggestedChart[];
  followUpQuestions?: string[];
  rawText?: string;
}

export interface QueryRequestBody {
  prompt: string;
  dataset?: DatasetRow[];
  columns?: string[];
  context?: Record<string, unknown>;
}