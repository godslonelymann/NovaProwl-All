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

type LineChartProps = {
  chart: ChartConfig;
  data: Row[];
};

export default function LineChart({ chart, data }: LineChartProps) {
  const { labels, values } = useMemo(
    () => aggregateByCategory(data, chart.xField, chart.yField, chart.agg),
    [data, chart.xField, chart.yField, chart.agg]
  );

  if (!labels.length) {
    return (
      <p className="text-xs text-gray-400">
        Not enough data to render this line chart.
      </p>
    );
  }

  const yTitle =
    chart.agg === "count"
      ? `COUNT of ${chart.yField}`
      : `${chart.agg.toUpperCase()} of ${chart.yField}`;

  return (
    <Plot
      data={[
        {
          x: labels,
          y: values,
          type: "scatter",
          mode: "lines+markers",
          line: { shape: "linear" },
          marker: { color: PALETTE[0] },
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