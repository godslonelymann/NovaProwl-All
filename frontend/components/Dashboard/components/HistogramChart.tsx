"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";

import { Row, ChartConfig } from "../chartTypes";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

type HistogramChartProps = {
  chart: ChartConfig;
  data: Row[];
  ranges?: {
    xRange?: [number, number] | null;
    yRange?: [number, number] | null;
  };
};

export default function HistogramChart({ chart, data, ranges }: HistogramChartProps) {
  // Try using yField → else xField → else auto-detect first numeric column
  let numericField = chart.yField || chart.xField;

  // Auto-detect numeric fallback
  const numericFallback = useMemo(() => {
    if (!data.length) return null;

    const sample = data[0];
    return Object.keys(sample).find((col) =>
      typeof sample[col] === "number" ||
      (!isNaN(Number(sample[col])) && sample[col] !== "")
    );
  }, [data]);

  // Final fallback if chosen field is not numeric
  const isChartFieldNumeric =
    numericField &&
    data.some((row) => !isNaN(Number(row[numericField])));

  if (!isChartFieldNumeric) {
    numericField = numericFallback || "";
  }

  const values = useMemo(() => {
    const nums: number[] = [];

    if (!numericField) return nums;

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
          range: ranges?.xRange ?? undefined,
        },
        yaxis: {
          title: "Count",
          range: ranges?.yRange ?? undefined,
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
