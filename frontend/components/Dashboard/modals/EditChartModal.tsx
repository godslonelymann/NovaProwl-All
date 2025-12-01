"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ChartConfig, ChartType, AggType } from "../chartTypes";

type EditChartModalProps = {
  open: boolean;
  onClose: () => void;
  chart: ChartConfig | null;
  columns: string[];
  numericCols: string[];
  categoricalCols: string[];
  // we send back the updated config WITHOUT id;
  // caller (DashboardSection) will merge it with the existing id.
  onSave: (updated: Omit<ChartConfig, "id">) => void;
};

const EditChartModal: React.FC<EditChartModalProps> = ({
  open,
  onClose,
  chart,
  columns,
  numericCols,
  categoricalCols,
  onSave,
}) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<ChartType>("bar");
  const [xField, setXField] = useState<string>("");
  const [yField, setYField] = useState<string>("");
  const [agg, setAgg] = useState<AggType>("sum");

  // hydrate local state when the modal opens or chart changes
  useEffect(() => {
    if (!open || !chart) return;

    setName(chart.name || "");
    setType(chart.type);
    setXField(chart.xField || categoricalCols[0] || columns[0] || "");
    setYField(chart.yField || numericCols[0] || "");
    setAgg(chart.agg ?? "sum");
  }, [open, chart, categoricalCols, numericCols, columns]);

  if (!open || !chart) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !xField) return;

    if (
      (type === "bar" || type === "line" || type === "donut") &&
      !yField
    ) {
      return;
    }

    const updated: Omit<ChartConfig, "id"> = {
      name: name.trim(),
      type,
      xField,
      yField,
      agg,
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            Edit Chart
          </h2>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3 text-sm">
          {/* Chart name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Chart Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
            />
          </div>

          {/* Chart type & aggregation */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Chart Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ChartType)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="pie">Pie Chart</option>
                <option value="donut">Donut Chart</option>
                {/* keep in sync with chartTypes if you add more */}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Aggregation
              </label>
              <select
                value={agg}
                onChange={(e) => setAgg(e.target.value as AggType)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
              >
                <option value="sum">Sum</option>
                <option value="avg">Average</option>
                <option value="count">Count</option>
              </select>
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                X-axis / Category Field
              </label>
              <select
                value={xField}
                onChange={(e) => setXField(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">Select column</option>
                {categoricalCols.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Y-axis / Value Field
              </label>
              <select
                value={yField}
                onChange={(e) => setYField(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">Select numeric column</option>
                {numericCols.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditChartModal;