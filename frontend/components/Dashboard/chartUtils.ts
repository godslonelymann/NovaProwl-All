// ------------------------------------------------------
// chartUtils.ts
// Shared dataset utilities + aggregations for charts
// ------------------------------------------------------

import { AggregationType } from "./chartTypes";

export type Row = Record<string, any>;

// ---------------------------------------------
// 1) Detect Numeric Columns
// ---------------------------------------------
export function getNumericColumns(rows: Row[]): string[] {
  if (!rows.length) return [];

  const cols = Object.keys(rows[0]);

  return cols.filter((col) =>
    rows.some((r) => {
      const v = r[col];
      const n = typeof v === "number" ? v : Number(v);
      return typeof n === "number" && !Number.isNaN(n);
    })
  );
}

// ---------------------------------------------
// 2) Detect Categorical Columns
// ---------------------------------------------
export function getCategoricalColumns(
  rows: Row[],
  maxUnique = 100
): string[] {
  if (!rows.length) return [];

  const cols = Object.keys(rows[0]);
  const result: string[] = [];

  for (const col of cols) {
    const values = rows
      .map((r) => r[col])
      .filter((x) => x !== null && x !== undefined);

    const unique = new Set(values);

    if (unique.size > 0 && unique.size <= maxUnique) {
      result.push(col);
    }
  }

  return result;
}

// ---------------------------------------------
// 3) Aggregation Utility
// ---------------------------------------------
export function applyAggregation(
  numbers: number[],
  agg: AggregationType
): number {
  if (!numbers.length) return 0;

  switch (agg) {
    case "sum":
      return numbers.reduce((a, b) => a + b, 0);
    case "avg":
      return numbers.reduce((a, b) => a + b, 0) / numbers.length;
    case "count":
      return numbers.length;
    case "min":
      return Math.min(...numbers);
    case "max":
      return Math.max(...numbers);
    default:
      return 0;
  }
}

// ---------------------------------------------
// 4) Aggregate By Category (Bar, Line, Pie, Donut)
// ---------------------------------------------
export function aggregateByCategory(
  rows: Row[],
  categoryField: string,
  numericField: string,
  agg: AggregationType
) {
  const groups = new Map<string, number[]>();

  for (const row of rows) {
    const cat = String(row[categoryField] ?? "Unknown");

    const raw = row[numericField];
    const num = typeof raw === "number" ? raw : Number(raw);
    if (Number.isNaN(num)) continue;

    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(num);
  }

  const labels: string[] = [];
  const values: number[] = [];

  for (const [cat, nums] of groups.entries()) {
    labels.push(cat);
    values.push(applyAggregation(nums, agg));
  }

  return { labels, values };
}

// ---------------------------------------------
// 5) Multi-Series Aggregation (Stacked/Grouped Bar)
// ---------------------------------------------
export function aggregateMultiSeries(
  rows: Row[],
  xField: string,
  groupField: string,
  yField: string,
  agg: AggregationType
) {
  const result: any = {};
  const groups = new Set<string>();
  const xValues = new Set<string>();

  for (const row of rows) {
    const x = String(row[xField] ?? "Unknown");
    const g = String(row[groupField] ?? "Unknown");

    const raw = row[yField];
    const num = typeof raw === "number" ? raw : Number(raw);
    if (Number.isNaN(num)) continue;

    xValues.add(x);
    groups.add(g);

    if (!result[x]) result[x] = {};
    if (!result[x][g]) result[x][g] = [];
    result[x][g].push(num);
  }

  // Convert to Plotly format
  const xCats = Array.from(xValues);
  const seriesLabels = Array.from(groups);

  const series = seriesLabels.map((g) => {
    const arr = xCats.map((x) => {
      const nums = result[x]?.[g] || [];
      return applyAggregation(nums, agg);
    });

    return { name: g, x: xCats, y: arr };
  });

  return {
    x: xCats,
    groups: seriesLabels,
    series,
  };
}

// ---------------------------------------------
// 6) Convert Unknown Values
// ---------------------------------------------
export function safeNumber(value: any): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isNaN(n) ? null : n;
}

// ---------------------------------------------
// 7) Histogram Binning (auto)
// ---------------------------------------------
export function computeHistogramBins(values: number[], bins = 20) {
  if (!values.length) return { bins: [], counts: [] };

  const min = Math.min(...values);
  const max = Math.max(...values);

  const step = (max - min) / bins;
  const counts = new Array(bins).fill(0);

  for (const v of values) {
    const idx = Math.min(
      bins - 1,
      Math.floor((v - min) / step)
    );
    counts[idx]++;
  }

  const binLabels = [...Array(bins)].map((_, i) => {
    const from = (min + step * i).toFixed(2);
    const to = (min + step * (i + 1)).toFixed(2);
    return `${from} - ${to}`;
  });

  return { bins: binLabels, counts };
}