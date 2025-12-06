"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";

import { Row, ChartConfig } from "../chartTypes";
// import { aggregateByCategory } from "../chartUtils";
import { safeAggregate } from "../chartSafeUtils";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

// Same palette style used elsewhere
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

type BarChartProps = {
  chart: ChartConfig;
  data: Row[];
  ranges?: {
    xRange?: [number, number] | null;
    yRange?: [number, number] | null;
  };
};

export default function BarChart({ chart, data, ranges }: BarChartProps) {
  // 🔥 Make agg always safe
  const agg = chart.agg || "sum";

  // 🔥 Use safeAggregate instead of aggregateByCategory
  const { labels, values } = useMemo(
    () => safeAggregate(data, chart.xField, chart.yField, agg),
    [data, chart.xField, chart.yField, agg]
  );

  if (!labels.length || !values.length) {
    return (
      <p className="text-xs text-gray-400">
        Not enough data to render this bar chart.
      </p>
    );
  }

  const yTitle = chart.yField
    ? `${agg.toUpperCase()} of ${chart.yField}`
    : agg.toUpperCase();

  return (
    <Plot
      data={[
        {
          x: labels,
          y: values,
          type: "bar",
          marker: {
            color: labels.map((_, i) => PALETTE[i % PALETTE.length]),
          },
        } as any,
      ]}
      layout={{
        autosize: true,
        margin: { l: 40, r: 20, t: 10, b: 40 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        xaxis: { title: chart.xField, tickangle: -30, range: ranges?.xRange ?? undefined },
        yaxis: { title: yTitle, range: ranges?.yRange ?? undefined },
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
