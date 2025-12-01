"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";

import { Row, ChartConfig } from "../chartTypes";

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
    if (!xField || !yField) {
      return { labels: [] as string[], values: [] as number[] };
    }

    const map = new Map<string, { sum: number; count: number }>();

    for (const row of data) {
      const cat = String(row[xField] ?? "Unknown");
      const raw = row[yField];
      const v =
        typeof raw === "number"
          ? raw
          : raw !== undefined && raw !== null
          ? Number(raw)
          : NaN;

      if (Number.isNaN(v)) continue;

      if (!map.has(cat)) map.set(cat, { sum: 0, count: 0 });
      const curr = map.get(cat)!;
      curr.sum += v;
      curr.count += 1;
    }

    const labels: string[] = [];
    const values: number[] = [];

    for (const [cat, { sum, count }] of map.entries()) {
      let val = sum;
      if (agg === "avg") val = count === 0 ? 0 : sum / count;
      if (agg === "count") val = count;
      labels.push(cat);
      values.push(val);
    }

    // Optional: sort descending so funnel shape looks nicer
    const indices = labels.map((_, i) => i);
    indices.sort((a, b) => values[b] - values[a]);

    return {
      labels: indices.map((i) => labels[i]),
      values: indices.map((i) => values[i]),
    };
  }, [data, xField, yField, agg]);

  if (!labels.length) {
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
          title: `${agg.toUpperCase()} of ${yField}`,
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