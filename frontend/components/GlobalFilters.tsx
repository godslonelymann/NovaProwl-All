
"use client";

import React, { useMemo, useState } from "react";
import { Filter, X } from "lucide-react";

type Row = Record<string, any>;

export type GlobalFilter = {
  id: number;
  column: string;
  values: string[];
};

type GlobalFiltersProps = {
  columns: string[];
  data: Row[];
  onApplyFilters?: (filters: GlobalFilter[], filteredRows: Row[]) => void;
};

export default function GlobalFilters({
  columns,
  data,
  onApplyFilters,
}: GlobalFiltersProps) {
  const [filters, setFilters] = useState<GlobalFilter[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  // unique values for the currently selected column
  const availableValues = useMemo(() => {
    if (!selectedColumn) return [] as string[];
    const vals = data
      .map((row) => row[selectedColumn])
      .filter((v) => v !== null && v !== undefined);
    const unique = Array.from(new Set(vals)).map((v) => String(v));
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, [data, selectedColumn]);

  const clearAll = () => {
    setFilters([]);
    if (onApplyFilters) {
      onApplyFilters([], data);
    }
  };

  const applyFiltersToData = (active: GlobalFilter[]): Row[] => {
    if (!active.length) return data;

    return data.filter((row) =>
      active.every((f) => {
        const v = row[f.column];
        if (v === null || v === undefined) return false;
        return f.values.includes(String(v));
      })
    );
  };

  const handleCreateFilter = () => {
    if (!selectedColumn || !selectedValues.length) return;

    const newFilter: GlobalFilter = {
      id: Date.now(),
      column: selectedColumn,
      values: selectedValues,
    };

    const nextFilters = [...filters, newFilter];
    setFilters(nextFilters);

    const filteredRows = applyFiltersToData(nextFilters);
    if (onApplyFilters) {
      onApplyFilters(nextFilters, filteredRows);
    }

    // reset & close modal
    setSelectedColumn("");
    setSelectedValues([]);
    setModalOpen(false);
  };

  const removeFilter = (id: number) => {
    const nextFilters = filters.filter((f) => f.id !== id);
    setFilters(nextFilters);

    const filteredRows = applyFiltersToData(nextFilters);
    if (onApplyFilters) {
      onApplyFilters(nextFilters, filteredRows);
    }
  };

  const toggleValue = (val: string) => {
    setSelectedValues((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  return (
    <>
      {/* Global Filters card */}
      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-700" />
          <span className="text-sm font-semibold text-slate-800">
            Global Filters
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1f6b7a] text-xs font-medium text-white hover:bg-[#185764]"
          >
            <span className="text-sm leading-none">＋</span>
            Add Filter
          </button>
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-xs font-medium text-slate-700 hover:bg-gray-200"
          >
            <X className="w-3 h-3" />
            Clear All
          </button>
        </div>
      </div>

      {/* Active filter pills under the card */}
      {filters.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {filters.map((f) => (
            <div
              key={f.id}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] text-slate-700"
            >
              <span className="font-semibold">{f.column}:</span>
              <span className="truncate max-w-[140px]">
                {f.values.length > 2
                  ? `${f.values.slice(0, 2).join(", ")} +${
                      f.values.length - 2
                    }`
                  : f.values.join(", ")}
              </span>
              <button
                onClick={() => removeFilter(f.id)}
                className="ml-1 hover:text-slate-900"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-4 text-[11px] text-slate-400">
          No filters applied. Click <span className="font-semibold">Add Filter</span>{" "}
          to narrow down the dataset.
        </p>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-md mx-4 rounded-2xl bg-white text-slate-900 shadow-2xl border border-slate-200">
            {/* header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">
                Add Global Filter
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-slate-100"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* body */}
            <div className="px-5 pt-4 pb-5 space-y-4">
              {/* Column select */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                  Filter Column
                </label>
                <select
                  value={selectedColumn}
                  onChange={(e) => {
                    setSelectedColumn(e.target.value);
                    setSelectedValues([]);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400"
                >
                  <option value="">Select column</option>
                  {columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              {/* Values chips */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                  Values
                </label>
                {selectedColumn ? (
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200 px-2 py-2 bg-slate-50/60">
                    {availableValues.length === 0 && (
                      <p className="text-[11px] text-slate-400">
                        No values found for this column.
                      </p>
                    )}
                    {availableValues.map((val) => {
                      const active = selectedValues.includes(val);
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => toggleValue(val)}
                          className={`px-3 py-1 rounded-full text-[11px] border ${
                            active
                              ? "bg-[#1f6b7a] text-white border-[#1f6b7a]"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Select a column first to see its values.
                  </p>
                )}
              </div>
            </div>

            {/* footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
              <button
                onClick={() => {
                  setModalOpen(false);
                  setSelectedColumn("");
                  setSelectedValues([]);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFilter}
                disabled={!selectedColumn || selectedValues.length === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-[#1f6b7a] hover:bg-[#185764] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Create Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}