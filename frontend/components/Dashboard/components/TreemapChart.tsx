"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";

import { Row, ChartConfig } from "../chartTypes";
import { aggregateByCategory } from "../chartUtils";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

type TreeMapChartProps = {
  chart: ChartConfig;
  data: Row[];
};

export default function TreeMapChart({ chart, data }: TreeMapChartProps) {
  const { labels, values } = useMemo(
    () => aggregateByCategory(data, chart.xField, chart.yField, chart.agg),
    [data, chart.xField, chart.yField, chart.agg]
  );

  if (!labels.length || !values.length) {
    return (
      <p className="text-xs text-gray-400">
        Not enough data to render treemap.
      </p>
    );
  }

  // Simple single-level treemap: each category is a child of a single root
  const parents = labels.map(() => "Total");

  return (
    <Plot
      data={[
        {
          type: "treemap",
          labels,
          parents,
          values,
          branchvalues: "total",
          hovertemplate: "<b>%{label}</b><br>Value: %{value}<extra></extra>",
        } as any,
      ]}
      layout={{
        autosize: true,
        margin: { l: 10, r: 10, t: 20, b: 10 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
      }}
      config={{
        displaylogo: false,
        responsive: true,
      }}
      style={{ width: "100%", height: 260 }}
    />
  );
}