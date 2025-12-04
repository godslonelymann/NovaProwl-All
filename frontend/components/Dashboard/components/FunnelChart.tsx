"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";

import { Row, ChartConfig } from "../chartTypes";
// ✅ Use the same safe aggregator as other charts
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

type FunnelChartProps = {
  chart: ChartConfig;
  data: Row[];
};

export default function FunnelChart({ chart, data }: FunnelChartProps) {
  const { xField, yField, agg } = chart;

  const { labels, values } = useMemo(() => {
    // If we don't even know which columns to use, bail out early
    if (!xField || !yField) {
      return { labels: [] as string[], values: [] as number[] };
    }

    // 1️⃣ Use safeAggregate to handle strings, nulls, mixed types, etc.
    const base = safeAggregate(data, xField, yField, agg);

    // 2️⃣ Sort descending so funnel visually makes sense
    const indices = base.labels.map((_, i) => i);
    indices.sort((a, b) => base.values[b] - base.values[a]);

    return {
      labels: indices.map((i) => base.labels[i]),
      values: indices.map((i) => base.values[i]),
    };
  }, [data, xField, yField, agg]);

  if (!labels.length || !values.length) {
    return (
      <p className="text-xs text-gray-400">
        Not enough data to render funnel chart.
      </p>
    );
  }

  return (
    <Plot
      data={[
        {
          type: "funnel",
          y: labels,
          x: values,
          textinfo: "value+percent initial",
          marker: {
            color: labels.map((_, i) => PALETTE[i % PALETTE.length]),
          },
        } as any,
      ]}
      layout={{
        autosize: true,
        margin: { l: 40, r: 20, t: 20, b: 40 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        xaxis: {
          title: `${agg?.toUpperCase?.() || "SUM"} of ${yField}`,
        },
        yaxis: {
          title: xField,
        },
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