"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";

import { Row, ChartConfig } from "../chartTypes";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

type BoxPlotChartProps = {
  chart: ChartConfig;
  data: Row[];
};

export default function BoxPlotChart({ chart, data }: BoxPlotChartProps) {
  const { xField, yField } = chart;

  const { traces, hasData } = useMemo(() => {
    const numericField = yField || xField;
    if (!numericField) {
      return { traces: [], hasData: false };
    }

    const grouped = new Map<string, number[]>();

    for (const row of data) {
      const cat = xField ? String(row[xField] ?? "Unknown") : "All";
      const raw = row[numericField];
      const v =
        typeof raw === "number"
          ? raw
          : raw !== undefined && raw !== null
          ? Number(raw)
          : NaN;

      if (Number.isNaN(v)) continue;

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