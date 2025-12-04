"use client";

import React, { useEffect, useMemo, useState } from "react";
import { DollarSign, Gauge, Layers, Hash, Plus, X } from "lucide-react";

type Row = Record<string, any>;

type CalcType = "sum" | "avg" | "max" | "min" | "count" | "countDistinct";

type KPIIcon = "money" | "gauge" | "stack" | "hash";

export type KPIConfig = {
  id: string;
  name: string;
  column: string;
  calc: CalcType;
  accentColor: string;
  icon: KPIIcon;
};

type KPISectionProps = {
  data: Row[];
  columns: string[];

  // 🔹 NEW: optional AI-suggested KPIs from backend
  suggestedKpis?: {
    id?: string;
    label: string;
    value: number;
    format?: string;
    unit?: string;
    trend?: string;
    description?: string;
  }[];
};

const STORAGE_KEY = "kpi_configs_v1";

function loadSavedKPIs(): KPIConfig[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveKPIs(kpis: KPIConfig[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(kpis));
  } catch {
    // ignore
  }
}

function calculateMetric(config: KPIConfig, rows: Row[]): number {
  const values = rows
    .map((r) => r[config.column])
    .filter((v) => v !== null && v !== undefined && v !== "");

  if (config.calc === "count") {
    return values.length;
  }

  if (config.calc === "countDistinct") {
    return new Set(values.map((v) => String(v))).size;
  }

  const nums = values
    .map((v) => (typeof v === "number" ? v : Number(v)))
    .filter((n) => !Number.isNaN(n));

  if (!nums.length) return 0;

  switch (config.calc) {
    case "sum":
      return nums.reduce((a, b) => a + b, 0);
    case "avg":
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    case "max":
      return Math.max(...nums);
    case "min":
      return Math.min(...nums);
    default:
      return 0;
  }
}

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return (value / 1_000_000).toFixed(1) + "M";
  }
  if (Math.abs(value) >= 1_000) {
    return (value / 1_000).toFixed(1) + "k";
  }
  if (Number.isInteger(value)) return value.toLocaleString();
  return value.toFixed(2);
}

function iconFor(type: KPIIcon) {
  switch (type) {
    case "money":
      return <DollarSign className="w-4 h-4 text-emerald-100" />;
    case "gauge":
      return <Gauge className="w-4 h-4 text-sky-100" />;
    case "stack":
      return <Layers className="w-4 h-4 text-fuchsia-100" />;
    case "hash":
      return <Hash className="w-4 h-4 text-amber-100" />;
    default:
      return null;
  }
}

const calcLabels: Record<CalcType, string> = {
  sum: "Sum",
  avg: "Average",
  max: "Max",
  min: "Min",
  count: "Count",
  countDistinct: "Count distinct",
};

const calcOptions: CalcType[] = [
  "sum",
  "avg",
  "max",
  "min",
  "count",
  "countDistinct",
];

export default function KPISection({
  data,
  columns,
  suggestedKpis,
}: KPISectionProps) {
  const [kpis, setKpis] = useState<KPIConfig[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftColumn, setDraftColumn] = useState("");
  const [draftCalc, setDraftCalc] = useState<CalcType>("sum");

  // -------------------------------------------------------------
  // 🔹 NEW: Convert backend KPIs → internal KPIConfig
  // -------------------------------------------------------------
  const aiKpis: KPIConfig[] = useMemo(() => {
    if (!suggestedKpis || suggestedKpis.length === 0) return [];

    return suggestedKpis.map((k, index) => ({
      id: k.id || `ai-kpi-${index}`,
      name: k.label,
      column: "__ai_static_value__", // virtual column; value comes from backend
      calc: "sum",
      icon: "gauge",
      accentColor: "from-indigo-500 to-indigo-400",
    }));
  }, [suggestedKpis]);

  // 🔹 NEW: Values map for AI KPIs
  const aiKpiValues = useMemo(() => {
    if (!suggestedKpis) return {};
    const map: Record<string, number> = {};
    suggestedKpis.forEach((k, index) => {
      const id = k.id || `ai-kpi-${index}`;
      map[id] = k.value ?? 0;
    });
    return map;
  }, [suggestedKpis]);

  // ---------- Initialize KPIs (dynamic defaults based on dataset) ----------
  useEffect(() => {
    const saved = loadSavedKPIs();
    if (saved && saved.length) {
      // keep only KPIs whose column still exists
      const filtered = saved.filter((k) => columns.includes(k.column));
      if (filtered.length) {
        setKpis(filtered);
        return;
      }
    }

    if (!columns.length || !data.length) {
      setKpis([]);
      return;
    }

    // numeric columns (based on actual values)
    const numericCols = columns.filter((col) =>
      data.some((row) => {
        const v = row[col];
        if (typeof v === "number") return true;
        const n = Number(v);
        return !Number.isNaN(n);
      })
    );

    // categorical-ish columns (non-numeric, non-empty)
    const categoricalCols = columns.filter((col) =>
      data.some((row) => {
        const v = row[col];
        if (v === null || v === undefined || v === "") return false;
        const n = Number(v);
        return Number.isNaN(n);
      })
    );

    const icons: KPIIcon[] = ["money", "gauge", "stack", "hash"];
    const colors = [
      "from-emerald-500 to-emerald-400",
      "from-sky-500 to-sky-400",
      "from-fuchsia-500 to-fuchsia-400",
      "from-amber-500 to-amber-400",
    ];

    const defaults: KPIConfig[] = [];

    // KPI 1: Sum of first numeric column
    if (numericCols[0]) {
      defaults.push({
        id: "kpi-1",
        name: `Sum of ${numericCols[0]}`,
        column: numericCols[0],
        calc: "sum",
        accentColor: colors[0],
        icon: icons[0],
      });
    }

    // KPI 2: Average of second numeric column (or fallback)
    if (numericCols[1] || numericCols[0]) {
      const col = numericCols[1] ?? numericCols[0];
      defaults.push({
        id: "kpi-2",
        name: `Average of ${col}`,
        column: col,
        calc: "avg",
        accentColor: colors[1],
        icon: icons[1],
      });
    }

    // KPI 3: Max of third numeric column (or fallback)
    if (numericCols[2] || numericCols[1] || numericCols[0]) {
      const col = numericCols[2] ?? numericCols[1] ?? numericCols[0];
      defaults.push({
        id: "kpi-3",
        name: `Max of ${col}`,
        column: col,
        calc: "max",
        accentColor: colors[2],
        icon: icons[2],
      });
    }

    // KPI 4: Count distinct of first categorical column
    if (categoricalCols[0]) {
      defaults.push({
        id: "kpi-4",
        name: `Count of ${categoricalCols[0]}`,
        column: categoricalCols[0],
        calc: "countDistinct",
        accentColor: colors[3],
        icon: icons[3],
      });
    }

    setKpis(defaults);
    saveKPIs(defaults);
  }, [columns.join("|")]); // re-run when column set changes

  // ---------- Metrics from current data ----------
  const kpiValues = useMemo(() => {
    const map: Record<string, number> = {};
    for (const k of kpis) {
      map[k.id] = calculateMetric(k, data);
    }
    return map;
  }, [kpis, data]);

  // ---------- Handlers ----------
  const openModal = () => {
    setDraftName("");
    setDraftColumn(columns[0] ?? "");
    setDraftCalc("sum");
    setIsModalOpen(true);
  };

  const handleCreateKPI = () => {
    if (!draftColumn) return;

    const name =
      draftName.trim() || `${calcLabels[draftCalc]} of ${draftColumn}`;

    const newKPI: KPIConfig = {
      id: `kpi-${Date.now()}`,
      name,
      column: draftColumn,
      calc: draftCalc,
      accentColor: "from-sky-500 to-sky-400",
      icon: "gauge",
    };

    const next = [...kpis, newKPI];
    setKpis(next);
    saveKPIs(next);
    setIsModalOpen(false);
  };

  const handleRemoveKPI = (id: string) => {
    const next = kpis.filter((k) => k.id !== id);
    setKpis(next);
    saveKPIs(next);
  };

  // ---------- render ----------
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">
          Key Performance Indicators
        </h2>
        <button
          onClick={openModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-600 text-white text-xs font-medium shadow-sm hover:bg-teal-700"
        >
          <span className="text-xs">
            <Plus className="w-3 h-3" />
          </span>
          Add KPI
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[...aiKpis, ...kpis].map((kpi, idx) => {
          const value =
            kpi.column === "__ai_static_value__"
              ? aiKpiValues[kpi.id]
              : kpiValues[kpi.id] ?? 0;
          const gradient = kpi.accentColor;

          return (
            <div
              key={kpi.id}
              className={`relative rounded-2xl bg-gradient-to-r ${gradient} text-white px-5 py-4 shadow-sm flex flex-col justify-between`}
            >
              {/* remove button */}
              <button
                onClick={() => handleRemoveKPI(kpi.id)}
                className="absolute top-2 right-2 p-1 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-3 h-3" />
              </button>

              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-full bg-black/10 flex items-center justify-center">
                  {iconFor(kpi.icon)}
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase tracking-wide text-white/70">
                    {kpi.name.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="text-2xl font-semibold tracking-tight">
                {formatNumber(value)}
              </div>

              <div className="mt-2 text-xs text-white/80 flex items-center gap-1">
                <span className="opacity-80">↑ +0.0%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add KPI modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">
                Add KPI
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  KPI Name
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Enter KPI name (optional)"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Data Column
                </label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                  value={draftColumn}
                  onChange={(e) => setDraftColumn(e.target.value)}
                >
                  <option value="" disabled>
                    Select column
                  </option>
                  {columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">
                  Calculation Type
                </label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                  value={draftCalc}
                  onChange={(e) =>
                    setDraftCalc(e.target.value as CalcType)
                  }
                >
                  {calcOptions.map((c) => (
                    <option key={c} value={c}>
                      {calcLabels[c]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateKPI}
                disabled={!draftColumn}
                className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create KPI
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}