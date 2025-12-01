// ------------------------------------------------------
// ChartFactory.tsx
// Central factory for rendering any chart type
// ------------------------------------------------------

"use client";

import React from "react";
import {
  ChartConfig,
  ChartType,
} from "./chartTypes";

import BarChart from "./components/BarChart";
import LineChart from "./components/LineChart";
import PieChart from "./components/PieChart";
import DonutChart from "./components/DonutChart";
import AreaChart from "./components/AreaChart";
import HistogramChart from "./components/HistogramChart";
import RadarChart from "./components/RadarChart";
import HeatmapChart from "./components/HeatmapChart";
import BubbleChart from "./components/BubbleChart";
import ScatterChart from "./components/ScatterChart";
import FunnelChart from "./components/FunnelChart";
import TreemapChart from "./components/TreemapChart";
import SunburstChart from "./components/SunburstChart";
import BoxPlotChart from "./components/BoxPlotChart";


import { Row } from "./chartTypes";

// ------------------------------------------------------------------
// Props
// ------------------------------------------------------------------
export type ChartFactoryProps = {
  chart: ChartConfig;
  data: Row[];
};

// ------------------------------------------------------------------
// Factory Renderer
// ------------------------------------------------------------------
export default function ChartFactory({ chart, data }: ChartFactoryProps) {
  switch (chart.type as ChartType) {
    case "bar":
      return <BarChart chart={chart} data={data} />;

    case "line":
      return <LineChart chart={chart} data={data} />;

    case "pie":
      return <PieChart chart={chart} data={data} />;

    case "donut":
      return <DonutChart chart={chart} data={data} />;

    case "area":
      return <AreaChart chart={chart} data={data} />;

    case "histogram":
      return <HistogramChart chart={chart} data={data} />;

    case "radar":
      return <RadarChart chart={chart} data={data} />;

    case "heatmap":
      return <HeatmapChart chart={chart} data={data} />;

    case "bubble":
      return <BubbleChart chart={chart} data={data} />;

    case "scatter":
      return <ScatterChart chart={chart} data={data} />;

    case "funnel":
      return <FunnelChart chart={chart} data={data} />;

    case "treemap":
      return <TreemapChart chart={chart} data={data} />;

    case "sunburst":
      return <SunburstChart chart={chart} data={data} />;
    
    case "box":
      return <BoxPlotChart chart={chart} data={data} />

    default:
      return (
        <div className="text-xs text-red-500 p-3">
          Unsupported chart type: <strong>{chart.type}</strong>
        </div>
      );
  }
}