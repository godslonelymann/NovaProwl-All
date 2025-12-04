"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";

import { Row, ChartConfig } from "../chartTypes";
import { safeAggregate } from "../chartSafeUtils"; // ✅ robust aggregator

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

type SunburstChartProps = {
  chart: ChartConfig;
  data: Row[];
};

export default function SunburstChart({ chart, data }: SunburstChartProps) {
  const { xField, yField } = chart;
  const agg = chart.agg || "sum";

  const { labels, values } = useMemo(() => {
    if (!xField) {
      return { labels: [] as string[], values: [] as number[] };
    }

    // ✅ Use the same safe aggregator as other charts
    return safeAggregate(data, xField, yField, agg);
  }, [data, xField, yField, agg]);

  if (!labels.length || !values.length) {
    return (
      <p className="text-xs text-gray-400">
        Not enough data to render sunburst chart.
      </p>
    );
  }

  // Single-level sunburst: every node has empty parent
  const parents = labels.map(() => "");

  return (
    <Plot
      data={[
        {
          type: "sunburst",
          labels,
          parents,
          values,
          branchvalues: "total",
          marker: {
            colors: labels.map((_, i) => PALETTE[i % PALETTE.length]),
          },
          hoverinfo: "label+value+percent entry",
        } as any,
      ]}
      layout={{
        autosize: true,
        margin: { l: 10, r: 10, t: 10, b: 10 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
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