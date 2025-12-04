// ------------------------------------------------------
// DashboardSection.tsx
// The main section that displays all dynamic charts
// ------------------------------------------------------

"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useRef, // 🔹 ADDED
} from "react";
import {
  Plus,
  X,
  Filter,      // 🔹 ADDED
  Edit3,       // 🔹 ADDED
  Download,    // 🔹 ADDED
  Maximize2,   // 🔹 ADDED
} from "lucide-react";

import ChartFactory from "./ChartFactory";
import AddChartModal from "./modals/AddChartModal";
import EditChartModal from "./modals/EditChartModal"; // 🔹 ADDED

import { ChartConfig, Row } from "./chartTypes";
import {
  getNumericColumns,
  getCategoricalColumns,
} from "./chartUtils";

// ------------------------------------------
// LocalStorage Keys
// ------------------------------------------
const STORAGE_KEY = "novaprowl_charts_v1";
const FILTER_STORAGE_KEY = "novaprowl_chart_filters_v1"; // 🔹 ADDED

// ------------------------------------------
// Types
// ------------------------------------------

// 🔹 Match backend chart schema (query.ts)
type AggregationType = "sum" | "avg" | "count" | "min" | "max";
type ChartType =
  | "bar"
  | "line"
  | "pie"
  | "donut"
  | "scatter"
  | "area"
  | "heatmap"
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

  // 🔹 NEW: charts suggested by the AI (via prompt)
  chartsFromPrompt?: BackendChart[];
};

type ChartFilter = {
  field: string;
  value: string;
} | null;

// small utility to apply chart-level filter
function applyChartFilter(rows: Row[], filter: ChartFilter | undefined): Row[] {
  if (!filter || !filter.field || !filter.value || filter.value === "__ALL__") {
    return rows;
  }
  return rows.filter((r) => String(r[filter.field]) === filter.value);
}

// ------------------------------------------------------
// Component
// ------------------------------------------------------
export default function DashboardSection({
  data,
  columns,
  chartsFromPrompt, // 🔹 NEW
}: DashboardSectionProps) {
  // Derive column types
  const numericCols = useMemo(() => getNumericColumns(data), [data]);
  const categoricalCols = useMemo(
    () => getCategoricalColumns(data),
    [data]
  );

  const firstCat = categoricalCols[0];
  const secondCat = categoricalCols[1] || categoricalCols[0];
  const firstNum = numericCols[0];
  const secondNum = numericCols[1] || numericCols[0];

  // ------------------------------------------
  // Load charts from localStorage on mount
  // ------------------------------------------
  const [charts, setCharts] = useState<ChartConfig[]>(() => {
    try {
      const raw = typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_KEY)
        : null;
      if (raw) return JSON.parse(raw);
    } catch { }
    return [];
  });

  // 🔹 Per-chart filters state
  const [chartFilters, setChartFilters] = useState<
    Record<string, ChartFilter>
  >(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem(FILTER_STORAGE_KEY)
          : null;
      if (raw) return JSON.parse(raw);
    } catch { }
    return {};
  });

  // 🔹 Which chart's filter menu is open
  const [filterMenuFor, setFilterMenuFor] = useState<string | null>(null);

  // 🔹 Edit chart state
  const [editingChart, setEditingChart] = useState<ChartConfig | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // 🔹 Enlarged chart state
  const [enlargedChart, setEnlargedChart] = useState<ChartConfig | null>(null);

  // Save charts persistently
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));
    } catch { }
  }, [charts]);

  // Save chart filters persistently 🔹
  useEffect(() => {
    try {
      localStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify(chartFilters)
      );
    } catch { }
  }, [chartFilters]);

  // ------------------------------------------
  // Add chart modal
  // ------------------------------------------
  const [addOpen, setAddOpen] = useState(false);

  const handleCreateChart = (cfg: Omit<ChartConfig, "id">) => {
    setCharts((prev) => [
      ...prev,
      { ...cfg, id: `chart-${Date.now()}-${Math.random()}` },
    ]);
  };

  const handleRemoveChart = (id: string) => {
    setCharts((prev) => prev.filter((c) => c.id !== id));
  };

  // 🔹 Duplicate chart
  const handleDuplicateChart = (chart: ChartConfig) => {
    const copy: ChartConfig = {
      ...chart,
      id: `chart-copy-${Date.now()}-${Math.random()}`,
      name: `${chart.name} (copy)`,
    };
    setCharts((prev) => [...prev, copy]);
  };

  // 🔹 Refresh chart (simple small animation via a version key if needed)
  const [refreshToken, setRefreshToken] = useState<number>(0);
  const handleRefreshChart = () => {
    setRefreshToken((t) => t + 1);
  };

  // 🔹 Download chart (JSON with chart config + data)
  const handleDownloadChart = (chart: ChartConfig) => {
    try {
      const payload = {
        chart,
        // you could choose filtered data here, but raw dataset is often useful
        data,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(chart.name || "chart").replace(/\s+/g, "_")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download chart:", err);
    }
  };

  // ------------------------------------------
  // Auto-inject 4 default charts ONLY if storage empty
  // ------------------------------------------
  useEffect(() => {
    if (charts.length === 0 && firstCat && firstNum) {
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
      setCharts(defaults);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------
  // 🔹 Inject AI-generated charts from prompts
  // ------------------------------------------
  // Listen for charts created from prompts (sent by AnalysisPanel)
  useEffect(() => {
    function handleAddChart(e: any) {
      const chart = e.detail;
      setCharts((prev) => [...prev, chart]);
    }

    window.addEventListener("novaprowl-add-chart", handleAddChart);
    return () => window.removeEventListener("novaprowl-add-chart", handleAddChart);
  }, []);

  // ----------------------------------------------------
  // Render
  // ----------------------------------------------------
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

      {/* Grid of cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {charts.map((chart) => {
          const activeFilter = chartFilters[chart.id] || null;

          // build possible values for filter
          const filterField = activeFilter?.field || chart.xField;
          const uniqueValues =
            filterField && data.length
              ? Array.from(
                new Set(
                  data
                    .map((row) => row[filterField])
                    .filter(
                      (v) => v !== null && v !== undefined && v !== ""
                    )
                    .map((v) => String(v))
                )
              )
              : [];

          const filteredData = applyChartFilter(data, activeFilter);

          return (
            <div
              key={chart.id}
              className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col"
            >
              {/* Chart header */}
              <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-white">
                <span className="text-xs font-semibold truncate">
                  {chart.name}
                </span>

                {/* 🔹 Chart actions (filter, edit, download, enlarge, delete) */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setFilterMenuFor((prev) =>
                        prev === chart.id ? null : chart.id
                      )
                    }
                    className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-white/10"
                    title="Filter chart"
                  >
                    <Filter className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingChart(chart);
                      setEditOpen(true);
                    }}
                    className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-white/10"
                    title="Edit chart"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadChart(chart)}
                    className="h-6 w-6 flex items-center justify-center rounded-full hover:bg:white/10"
                    title="Download chart"
                  >
                    <Download className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnlargedChart(chart)}
                    className="h-6 w-6 flex items-center justify-center rounded-full hover:bg:white/10"
                    title="Expand chart"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDuplicateChart(chart)}
                    className="h-6 w-6 flex items-center justify-center rounded-full hover:bg:white/10"
                    title="Duplicate chart"
                  >
                    <span className="text-[10px] font-semibold">2×</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRefreshChart}
                    className="h-6 w-6 flex items-center justify-center rounded-full hover:bg:white/10"
                    title="Refresh chart"
                  >
                    {/* simple visual cue; behavior is via refreshToken state */}
                    <span className="text-[11px] font-semibold">⟳</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveChart(chart.id)}
                    className="h-6 w-6 flex items-center justify-center rounded-full hover:bg:white/10"
                    title="Remove chart"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* 🔹 Optional filter bar under header */}
              {filterMenuFor === chart.id && (
                <div className="px-4 py-2 bg-slate-900 text-[11px] text-gray-100 flex items-center gap-2 border-t border-slate-700">
                  <span className="uppercase tracking-wide text-[10px] text-gray-400">
                    Filter:
                  </span>

                  {/* Field selector (use categorical + chart.xField as default) */}
                  <select
                    className="rounded-md bg-slate-800 border border-slate-600 px-2 py-1 text-[11px] outline-none"
                    value={filterField}
                    onChange={(e) => {
                      const field = e.target.value;
                      setChartFilters((prev) => ({
                        ...prev,
                        [chart.id]: field
                          ? {
                            field,
                            value: "__ALL__",
                          }
                          : null,
                      }));
                    }}
                  >
                    <option value={chart.xField}>{chart.xField}</option>
                    {categoricalCols
                      .filter((c) => c !== chart.xField)
                      .map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                  </select>

                  {/* Value selector */}
                  <select
                    className="rounded-md bg-slate-800 border border-slate-600 px-2 py-1 text-[11px] outline-none"
                    value={activeFilter?.value || "__ALL__"}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "__CLEAR__") {
                        setChartFilters((prev) => {
                          const copy = { ...prev };
                          delete copy[chart.id];
                          return copy;
                        });
                        return;
                      }
                      setChartFilters((prev) => ({
                        ...prev,
                        [chart.id]: {
                          field: filterField,
                          value,
                        },
                      }));
                    }}
                  >
                    <option value="__ALL__">All values</option>
                    {uniqueValues.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                    {activeFilter && (
                      <option value="__CLEAR__">Clear filter</option>
                    )}
                  </select>
                </div>
              )}

              {/* Chart content */}
              <div className="p-3 flex-1 bg-slate-50">
                <ChartFactory
                  key={refreshToken} // 🔹 simple re-mount on refresh
                  chart={chart}
                  data={filteredData}
                />
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {charts.length === 0 && (
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

      {/* Add Chart Modal */}
      <AddChartModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreate={handleCreateChart}
        columns={columns}
        numericCols={numericCols}
        categoricalCols={categoricalCols}
      />

      {/* 🔹 Edit Chart Modal */}
      <EditChartModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        chart={editingChart}
        columns={columns}
        numericCols={numericCols}
        categoricalCols={categoricalCols}
        onSave={(updated) => {
          if (!editingChart) return;
          setCharts((prev) =>
            prev.map((c) =>
              c.id === editingChart.id ? { ...c, ...updated } : c
            )
          );
        }}
      />

      {/* 🔹 Enlarged chart popup */}
      {enlargedChart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-5xl max-h-[90vh] rounded-2xl bg-white shadow-2xl border border-gray-200 flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-900 truncate">
                {enlargedChart.name}
              </span>
              <button
                onClick={() => setEnlargedChart(null)}
                className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-auto bg-slate-50">
              <ChartFactory
                chart={enlargedChart}
                data={applyChartFilter(
                  data,
                  chartFilters[enlargedChart.id] || null
                )}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}