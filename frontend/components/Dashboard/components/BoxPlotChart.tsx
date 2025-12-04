"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";

import { Row, ChartConfig } from "../chartTypes";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

type BoxPlotChartProps = {
  chart: ChartConfig;
  data: Row[];
};

// 🔹 Robust numeric parser for any dataset
function toNumeric(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // remove common thousand separators
    const normalized = trimmed.replace(/,/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  // allow booleans as 0/1 if they appear
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  // fallback: try generic cast
  const coerced = Number((value as any).toString?.() ?? value);
  return Number.isFinite(coerced) ? coerced : null;
}

export default function BoxPlotChart({ chart, data }: BoxPlotChartProps) {
  const { xField, yField } = chart;

  const { traces, hasData } = useMemo(() => {
    const numericField = yField || xField;
    if (!numericField || !data || data.length === 0) {
      return { traces: [], hasData: false };
    }

    const grouped = new Map<string, number[]>();

    for (const row of data) {
      const cat = xField ? String(row[xField] ?? "Unknown") : "All";
      const raw = row[numericField];
      const v = toNumeric(raw);

      if (v === null) continue;

      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(v);
    }

    const entries = Array.from(grouped.entries()).filter(
      ([, vals]) => vals.length > 0
    );

    if (!entries.length) {
      return { traces: [], hasData: false };
    }

    const traces = entries.map(([cat, vals]) => ({
      y: vals,
      name: cat,
      type: "box",
      boxpoints: "outliers",
      jitter: 0.4,
      pointpos: 0,
    }));

    return { traces, hasData: true };
  }, [data, xField, yField]);

  if (!hasData) {
    return (
      <p className="text-xs text-gray-400">
        Not enough numeric data to render box plot.
      </p>
    );
  }

  const numericField = yField || xField || "";

  return (
    <Plot
      data={traces as any}
      layout={{
        autosize: true,
        margin: { l: 40, r: 20, t: 20, b: 40 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        xaxis: {
          title: xField || "",
          zeroline: false,
        },
        yaxis: {
          title: numericField,
          zeroline: false,
        },
        showlegend: !!xField,
      }}
      config={{
        displaylogo: false,
        responsive: true,
        modeBarButtonsToRemove: ["toImage"],
      }}
      useResizeHandler
      style={{ width: "100%", height: 260 }}
    />
  );
}