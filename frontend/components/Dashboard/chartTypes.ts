// ---------------------------------------------
// chartTypes.ts
// Master list of all supported chart types
// ---------------------------------------------

export type ChartType =
  | "bar"
  | "line"
  | "pie"
  | "donut"
  | "area"
  | "stackedBar"
  | "groupedBar"
  | "scatter"
  | "bubble"
  | "histogram"
  | "box"
  | "heatmap"
  | "treemap"
  | "sunburst"
  | "radar"
  | "funnel"
  | "autoSuggest"; // LLM-generated chart

// ---------------------------------------------
// Aggregation types (used for numeric fields)
// ---------------------------------------------

export type AggregationType = "sum" | "avg" | "count" | "min" | "max";

// ---------------------------------------------
// Chart configuration object stored per chart
// ---------------------------------------------

export interface ChartConfig {
  id: string;
  name: string;
  type: ChartType;

  // X-axis field (categorical or numeric depending on chart type)
  xField: string;

  // Y-axis field (numeric; optional for non-numeric charts)
  yField?: string;

  // Second numeric field (for bubble size, radar metrics etc.)
  yField2?: string;

  // Aggregation operation applied to Y field
  agg?: AggregationType;

  // Whether the chart uses multi-series grouping (grouped/stacked bars)
  groupBy?: string;

  // Optional custom colors per chart
  colors?: string[];

  // Optional "LLM explanation" summary for AI-generated charts
  aiSummary?: string;
}

// ---------------------------------------------
// Default palette used across charts
// ---------------------------------------------

export const DEFAULT_COLORS = [
  "#2F8DE4",
  "#F4A261",
  "#E76F51",
  "#2A9D8F",
  "#9B5DE5",
  "#F15BB5",
  "#FFB703",
  "#118AB2",
  "#06D6A0",
  "#EF476F",
];

// ---------------------------------------------
// A helper list for UI dropdowns
// ---------------------------------------------

export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  bar: "Bar Chart",
  line: "Line Chart",
  pie: "Pie Chart",
  donut: "Donut Chart",
  area: "Area Chart",
  scatter: "Scatter Plot",
  bubble: "Bubble Chart",
  histogram: "Histogram",
  box: "Box Plot",
  heatmap: "Heatmap",
  treemap: "Treemap",
  sunburst: "Sunburst Chart",
  radar: "Radar Chart",
  funnel: "Funnel Chart",
  autoSuggest: "AI-Suggested Chart",
};