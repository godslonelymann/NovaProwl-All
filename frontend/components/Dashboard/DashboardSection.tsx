// ------------------------------------------------------
// DashboardSection.tsx
// Chart grid with per-chart data zoom controls
// + delete & expand (scale up) overlay
// ------------------------------------------------------

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, ZoomIn, ZoomOut, RefreshCw, X, Maximize2 } from "lucide-react";

import ChartFactory from "./ChartFactory";
import AddChartModal from "./modals/AddChartModal";
import { ChartConfig, Row } from "./chartTypes";
import { getNumericColumns, getCategoricalColumns } from "./chartUtils";

type AggregationType = "sum" | "avg" | "count" | "min" | "max";
type ChartType =
  | "bar"
  | "line"
  | "pie"
  | "donut"
  | "scatter"
  | "area"
  | "heatmap"
  | "histogram"
  | "bubble"
  | "box"
  | "radar"
  | "funnel"
  | "sunburst";

export type BackendChart = {
  id?: string;
  title: string;
  type: ChartType;
  xField: string;
  yField?: string;
  agg?: AggregationType;
  description?: string;
};

type DashboardSectionProps = {
  data: Row[];
  columns: string[];
  chartsFromPrompt?: BackendChart[];
};

type RangePair = [number, number];

const isAxisChart = (type: ChartConfig["type"]) =>
  ["bar", "line", "area", "scatter", "bubble", "histogram", "heatmap", "box"].includes(
    type
  );

const getNumericDomain = (rows: Row[], field?: string): RangePair | null => {
  if (!field) return null;
  const nums: number[] = [];
  for (const row of rows) {
    const raw = row[field];
    const v =
      typeof raw === "number"
        ? raw
        : raw !== undefined && raw !== null && raw !== ""
        ? Number(raw)
        : NaN;
    if (!Number.isNaN(v)) nums.push(v);
  }
  if (!nums.length) return null;
  return [Math.min(...nums), Math.max(...nums)];
};

const applyZoom = (
  current: RangePair | null,
  full: RangePair | null,
  factor: number
): RangePair | null => {
  if (!full) return current;
  const [fullMin, fullMax] = full;
  const base = current ?? full;
  const center = (base[0] + base[1]) / 2;
  const half = ((base[1] - base[0]) * factor) / 2;
  let newMin = center - half;
  let newMax = center + half;
  newMin = Math.max(fullMin, newMin);
  newMax = Math.min(fullMax, newMax);
  if (newMax - newMin <= 0) return base;
  return [newMin, newMax];
};

type ChartCardProps = {
  chart: ChartConfig;
  data: Row[];
  fullX?: RangePair | null;
  fullY?: RangePair | null;
  onDelete?: () => void;
  onExpand?: () => void;
};

function ChartCard({
  chart,
  data,
  fullX,
  fullY,
  onDelete,
  onExpand,
}: ChartCardProps) {
  const [xRange, setXRange] = useState<RangePair | null>(null);
  const [yRange, setYRange] = useState<RangePair | null>(null);

  const axisBased = isAxisChart(chart.type);

  const handleZoom = (dir: "in" | "out") => {
    if (!axisBased) return;
    const factor = dir === "in" ? 0.7 : 1.3;
    if (fullX) {
      setXRange((prev) => applyZoom(prev, fullX, factor));
    }
    if (fullY) {
      setYRange((prev) => applyZoom(prev, fullY, factor));
    }
  };

  const handleReset = () => {
    setXRange(null);
    setYRange(null);
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!axisBased) return;
    e.preventDefault();
    if (e.deltaY < 0) handleZoom("in");
    else handleZoom("out");
  };

  const showToolbar = axisBased && (fullX || fullY);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-white">
        <span className="text-xs font-semibold truncate">{chart.name}</span>
        <div className="flex items-center gap-1">
          {showToolbar && (
            <>
              <button
                type="button"
                onClick={() => handleZoom("in")}
                className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-white/10"
                title="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleZoom("out")}
                className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-white/10"
                title="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-white/10"
                title="Reset zoom"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Scale up / expand */}
          <button
            type="button"
            onClick={onExpand}
            className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-white/10"
            title="Expand chart"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Delete chart */}
          <button
            type="button"
            onClick={onDelete}
            className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-white/10"
            title="Delete chart"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3 flex-1 bg-slate-50" onWheel={onWheel}>
        <ChartFactory
          chart={chart}
          data={data}
          ranges={
            axisBased
              ? {
                  xRange,
                  yRange,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}

// ---------- Expanded chart overlay (scale up) ----------
type ExpandedChartModalProps = {
  chart: ChartConfig;
  data: Row[];
  onClose: () => void;
};

function ExpandedChartModal({ chart, data, onClose }: ExpandedChartModalProps) {
  const axisBased = isAxisChart(chart.type);

  const fullX = axisBased ? getNumericDomain(data, chart.xField) : null;
  const fullY = axisBased
    ? getNumericDomain(data, chart.yField || chart.xField)
    : null;

  const [xRange, setXRange] = useState<RangePair | null>(null);
  const [yRange, setYRange] = useState<RangePair | null>(null);

  const handleZoom = (dir: "in" | "out") => {
    if (!axisBased) return;
    const factor = dir === "in" ? 0.7 : 1.3;
    if (fullX) {
      setXRange((prev) => applyZoom(prev, fullX, factor));
    }
    if (fullY) {
      setYRange((prev) => applyZoom(prev, fullY, factor));
    }
  };

  const handleReset = () => {
    setXRange(null);
    setYRange(null);
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!axisBased) return;
    e.preventDefault();
    if (e.deltaY < 0) handleZoom("in");
    else handleZoom("out");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative w-full max-w-5xl max-h-[90vh] mx-4 rounded-2xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900">
              {chart.name}
            </span>
            <span className="text-[11px] text-gray-500">
              Expanded view · Scroll to zoom, or use controls
            </span>
          </div>

          <div className="flex items-center gap-2">
            {axisBased && (fullX || fullY) && (
              <>
                <button
                  type="button"
                  onClick={() => handleZoom("in")}
                  className="h-8 w-8 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50"
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  type="button"
                  onClick={() => handleZoom("out")}
                  className="h-8 w-8 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="h-8 w-8 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50"
                  title="Reset zoom"
                >
                  <RefreshCw className="w-4 h-4 text-gray-700" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-800"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chart area */}
        <div className="flex-1 p-4 bg-slate-50 overflow-auto" onWheel={onWheel}>
          <div className="w-full h-[60vh] min-h-[320px] rounded-xl border border-gray-200 bg-white p-3">
            <ChartFactory
              chart={chart}
              data={data}
              ranges={
                axisBased
                  ? {
                      xRange,
                      yRange,
                    }
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Main DashboardSection ----------
export default function DashboardSection({
  data,
  columns,
  chartsFromPrompt,
}: DashboardSectionProps) {
  // Derive column types
  const numericCols = useMemo(() => getNumericColumns(data), [data]);
  const categoricalCols = useMemo(() => getCategoricalColumns(data), [data]);

  const firstCat = categoricalCols[0];
  const secondCat = categoricalCols[1] || categoricalCols[0];
  const firstNum = numericCols[0];
  const secondNum = numericCols[1] || numericCols[0];

  // User-added charts (persisted)
  const STORAGE_KEY = "novaprowl_charts_v1";
  const [charts, setCharts] = useState<ChartConfig[]>(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEY)
          : null;
      if (raw) {
        const parsed: ChartConfig[] = JSON.parse(raw);
        return parsed.filter((c) => !c.id.startsWith("default-"));
      }
    } catch {
      /* ignore */
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));
    } catch {
      /* ignore */
    }
  }, [charts]);

  const baseCharts: ChartConfig[] = useMemo(() => {
    if (!firstCat || !firstNum) return [];
    const defaults: ChartConfig[] = [
      {
        id: "default-1",
        name: `Sum of ${firstNum} by ${firstCat}`,
        type: "bar",
        xField: firstCat,
        yField: firstNum,
        agg: "sum",
      },
      {
        id: "default-2",
        name: `Trend of ${firstNum}`,
        type: "line",
        xField: firstCat,
        yField: firstNum,
        agg: "sum",
      },
      {
        id: "default-3",
        name: `Distribution of ${firstNum}`,
        type: "pie",
        xField: firstCat,
        yField: firstNum,
        agg: "sum",
      },
      {
        id: "default-4",
        name: `Avg ${secondNum} by ${secondCat}`,
        type: "donut",
        xField: secondCat,
        yField: secondNum,
        agg: "avg",
      },
    ];
    return defaults;
  }, [firstCat, firstNum, secondCat, secondNum]);

  const aiCharts: ChartConfig[] = useMemo(
    () =>
      (chartsFromPrompt || []).map((c) => ({
        id:
          c.id ||
          `ai-chart-${c.title}-${Math.random().toString(36).slice(2, 8)}`,
        name: c.title,
        type: c.type as ChartConfig["type"],
        xField: c.xField,
        yField: c.yField || c.xField,
        agg: (c.agg as ChartConfig["agg"]) || "sum",
        description: c.description,
      })),
    [chartsFromPrompt]
  );

  const allCharts: ChartConfig[] = useMemo(
    () => [...baseCharts, ...aiCharts, ...charts],
    [baseCharts, aiCharts, charts]
  );

  // Hidden chart IDs (for delete)
  const [hiddenChartIds, setHiddenChartIds] = useState<string[]>([]);
  const visibleCharts = useMemo(
    () => allCharts.filter((c) => !hiddenChartIds.includes(c.id)),
    [allCharts, hiddenChartIds]
  );

  const handleDeleteChart = (id: string) => {
    // For persisted user charts, also remove from `charts` state
    setCharts((prev) => prev.filter((c) => c.id !== id));
    // For defaults / AI charts, hide by ID
    setHiddenChartIds((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
  };

  // Expanded chart overlay state
  const [expandedChart, setExpandedChart] = useState<ChartConfig | null>(null);

  // Add chart modal
  const [addOpen, setAddOpen] = useState(false);

  const handleCreateChart = (cfg: Omit<ChartConfig, "id">) => {
    setCharts((prev) => [
      ...prev,
      { ...cfg, id: `chart-${Date.now()}-${Math.random()}` },
    ]);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">Dashboard</h2>

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800"
        >
          <Plus className="w-3 h-3" />
          Add Chart
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {visibleCharts.map((chart) => {
          const fullX = isAxisChart(chart.type)
            ? getNumericDomain(data, chart.xField)
            : null;
          const fullY = isAxisChart(chart.type)
            ? getNumericDomain(data, chart.yField || chart.xField)
            : null;

          return (
            <ChartCard
              key={chart.id}
              chart={chart}
              data={data}
              fullX={fullX}
              fullY={fullY}
              onDelete={() => handleDeleteChart(chart.id)}
              onExpand={() => setExpandedChart(chart)}
            />
          );
        })}

        {visibleCharts.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-gray-200 p-6 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-600 mb-2">
              No charts yet for this dataset.
            </p>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800"
            >
              <Plus className="w-3 h-3" />
              Add your first chart
            </button>
          </div>
        )}
      </div>

      <AddChartModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreate={handleCreateChart}
        columns={columns}
        numericCols={numericCols}
        categoricalCols={categoricalCols}
      />

      {/* Expanded (scale up) modal */}
      {expandedChart && (
        <ExpandedChartModal
          chart={expandedChart}
          data={data}
          onClose={() => setExpandedChart(null)}
        />
      )}
    </section>
  );
}