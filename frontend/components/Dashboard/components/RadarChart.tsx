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

type RadarChartProps = {
  chart: ChartConfig;
  data: Row[];
};

export default function RadarChart({ chart, data }: RadarChartProps) {
  const { labels, values } = useMemo(
    () => aggregateByCategory(data, chart.xField, chart.yField, chart.agg),
    [data, chart.xField, chart.yField, chart.agg]
  );

  if (!labels.length || !values.length) {
    return (
      <p className="text-xs text-gray-400">
        Not enough data to render radar chart.
      </p>
    );
  }

  return (
    <Plot
      data={[
        {
          type: "scatterpolar",
          r: values,
          theta: labels,
          fill: "toself",
          marker: {
            color: PALETTE[0],
          },
        } as any,
      ]}
      layout={{
        autosize: true,
        margin: { l: 20, r: 20, t: 20, b: 20 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        polar: {
          radialaxis: {
            visible: true,
            linewidth: 1,
            gridcolor: "rgba(0,0,0,0.1)",
          },
        },
      }}
      config={{
        displaylogo: false,
        responsive: true,
      }}
      style={{ width: "100%", height: 260 }}
    />
  );
}