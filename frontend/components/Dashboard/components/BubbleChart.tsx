"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";

import { Row, ChartConfig } from "../chartTypes";
import { aggregateByCategory } from "../chartUtils";

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
    () => aggregateByCategory(data, chart.xField, chart.yField, chart.agg),
    [data, chart.xField, chart.yField, chart.agg]
  );

  if (!labels.length || !values.length) {
    return (
      <p className="text-xs text-gray-400">
        Not enough data to render bubble chart.
      </p>
    );
  }

  return (
    <Plot
      data={[
        {
          x: labels,
          y: values,
          mode: "markers",
          marker: {
            size: values.map((v) => Math.max(10, v)), // bubble size
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
        yaxis: { title: `${chart.agg.toUpperCase()} → ${chart.yField}` },
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