"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";

import { Row, ChartConfig } from "../chartTypes";
import { aggregateByCategory } from "../chartUtils";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

type HeatmapChartProps = {
  chart: ChartConfig;
  data: Row[];
};

export default function HeatmapChart({ chart, data }: HeatmapChartProps) {
  const { labels, values } = useMemo(
    () => aggregateByCategory(data, chart.xField, chart.yField, chart.agg),
    [data, chart.xField, chart.yField, chart.agg]
  );

  if (!labels.length || !values.length) {
    return (
      <p className="text-xs text-gray-400">
        Not enough data to render heatmap.
      </p>
    );
  }

  // We render a 1-row heatmap: categories along X, color encodes the aggregated value
  const z = [values];

  return (
    <Plot
      data={[
        {
          z,
          x: labels,
          y: [chart.yField || chart.agg.toUpperCase()],
          type: "heatmap",
          colorscale: "Blues",
          showscale: true,
        } as any,
      ]}
      layout={{
        autosize: true,
        margin: { l: 40, r: 20, t: 20, b: 40 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        xaxis: {
          title: chart.xField,
          tickangle: -30,
        },
        yaxis: {
          title: "",
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