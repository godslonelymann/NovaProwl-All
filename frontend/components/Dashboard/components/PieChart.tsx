"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";

import { Row, ChartConfig } from "../chartTypes";
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

type PieChartProps = {
  chart: ChartConfig;
  data: Row[];
};

export default function PieChart({ chart, data }: PieChartProps) {
  const { labels, values } = useMemo(
    () =>
      safeAggregate(data, chart.xField, chart.yField, chart.agg || "sum"),
    [data, chart.xField, chart.yField, chart.agg]
  );

  if (!labels.length) {
    return (
      <p className="text-xs text-gray-400">
        Not enough data to render this pie chart.
      </p>
    );
  }

  return (
    <Plot
      data={[
        {
          labels,
          values,
          type: "pie",
          hole: 0,
          marker: {
            colors: labels.map((_, i) => PALETTE[i % PALETTE.length]),
          },
        },
      ]}
      layout={{
        autosize: true,
        margin: { l: 20, r: 20, t: 10, b: 10 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        showlegend: true,
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