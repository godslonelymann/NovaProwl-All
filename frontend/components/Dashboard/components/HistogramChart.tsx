"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";

import { Row, ChartConfig } from "../chartTypes";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

type HistogramChartProps = {
  chart: ChartConfig;
  data: Row[];
};

export default function HistogramChart({ chart, data }: HistogramChartProps) {
  // For histogram we mostly care about a single numeric field.
  // Prefer yField if present, otherwise fall back to xField.
  const numericField = chart.yField || chart.xField;

  const values = useMemo(() => {
    const nums: number[] = [];

    for (const row of data) {
      const raw = row[numericField];
      const v =
        typeof raw === "number"
          ? raw
          : raw !== undefined && raw !== null
          ? Number(raw)
          : NaN;

      if (!Number.isNaN(v)) nums.push(v);
    }

    return nums;
  }, [data, numericField]);

  if (!values.length) {
    return (
      <p className="text-xs text-gray-400">
        Not enough numeric data to render histogram.
      </p>
    );
  }

  return (
    <Plot
      data={[
        {
          x: values,
          type: "histogram",
          opacity: 0.85,
          autobinx: true,
        } as any,
      ]}
      layout={{
        autosize: true,
        margin: { l: 40, r: 20, t: 20, b: 40 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        xaxis: {
          title: numericField,
          zeroline: false,
        },
        yaxis: {
          title: "Count",
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