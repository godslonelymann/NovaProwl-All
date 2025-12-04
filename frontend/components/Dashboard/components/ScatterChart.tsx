"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";

import { Row, ChartConfig } from "../chartTypes";
import { safeAggregate } from "../chartSafeUtils"; // ✅ use robust aggregator

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

type ScatterChartProps = {
  chart: ChartConfig;
  data: Row[];
};

export default function ScatterChart({ chart, data }: ScatterChartProps) {
  // For scatter we treat x = labels, y = values (same aggregation logic)
  const agg = chart.agg || "sum";

  const { labels, values } = useMemo(
    () => safeAggregate(data, chart.xField, chart.yField, agg),
    [data, chart.xField, chart.yField, agg]
  );

  if (!labels.length || !values.length) {
    return (
      <p className="text-xs text-gray-400">
        Not enough data to render scatter chart.
      </p>
    );
  }

  const yTitle =
    agg === "count"
      ? `COUNT of ${chart.yField}`
      : `${agg.toUpperCase()} of ${chart.yField}`;

  return (
    <Plot
      data={[
        {
          x: labels,
          y: values,
          type: "scatter",
          mode: "markers",
          marker: {
            size: 10,
            color: labels.map((_, i) => PALETTE[i % PALETTE.length]),
          },
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