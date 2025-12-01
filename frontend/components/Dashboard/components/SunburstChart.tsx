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

type SunburstChartProps = {
  chart: ChartConfig;
  data: Row[];
};

export default function SunburstChart({ chart, data }: SunburstChartProps) {
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

    return { labels, values };
  }, [data, xField, yField, agg]);

  if (!labels.length) {
    return (
      <p className="text-xs text-gray-400">
        Not enough data to render sunburst chart.
      </p>
    );
  }

  const parents = labels.map(() => ""); // single-level sunburst

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