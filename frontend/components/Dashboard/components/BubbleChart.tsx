"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";

import { Row, ChartConfig } from "../chartTypes";
// ❌ OLD
// import { aggregateByCategory } from "../chartUtils";
// ✅ NEW
import { safeAggregate } from "../chartSafeUtils";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const PALETTE = [
  "#2F8DE4",
  "#F4A261",
  "#E76F51",
  "#2A9D8F",
  "#9B5DE5",
  "#F15BB5",
  "#FFB703",
  "#118AB2",
];

type BubbleChartProps = {
  chart: ChartConfig;
  data: Row[];
};

export default function BubbleChart({ chart, data }: BubbleChartProps) {
  const { labels, values } = useMemo(
    () => safeAggregate(data, chart.xField, chart.yField, chart.agg),
    [data, chart.xField, chart.yField, chart.agg]
  );

  if (!labels.length || !values.length) {
    return (
      <p className="text-xs text-gray-400">
        Not enough data to render bubble chart.
      </p>
    );
  }

  // 🔹 Ensure numeric & nicely scaled bubble sizes
  const numericValues = values.map((v) =>
    typeof v === "number" && Number.isFinite(v) ? v : 0
  );
  const max = Math.max(...numericValues, 0);

  const sizes = numericValues.map((v) => {
    if (max <= 0) return 12; // fallback size
    const normalized = v / max;           // 0 → 1
    return 10 + normalized * 30;          // 10–40px bubble size
  });

  const yTitle =
    chart.agg === "count"
      ? `COUNT of ${chart.yField || chart.xField}`
      : `${(chart.agg || "value").toUpperCase()} of ${chart.yField || chart.xField}`;

  return (
    <Plot
      data={[
        {
          x: labels,
          y: numericValues,
          mode: "markers",
          marker: {
            size: sizes,
            color: labels.map((_, i) => PALETTE[i % PALETTE.length]),
            opacity: 0.7,
          },
          type: "scatter",
        } as any,
      ]}
      layout={{
        autosize: true,
        margin: { l: 40, r: 20, t: 10, b: 40 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        xaxis: { title: chart.xField },
        yaxis: { title: yTitle },
      }}
      useResizeHandler
      style={{ width: "100%", height: 260 }}
      config={{
        displaylogo: false,
        responsive: true,
        modeBarButtonsToRemove: ["toImage"],
      }}
    />
  );
}