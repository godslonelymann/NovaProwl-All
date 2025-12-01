"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { ChartConfig, ChartType, AggType } from "../chartTypes";

type AddChartModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (config: Omit<ChartConfig, "id">) => void;
  columns: string[];
  numericCols: string[];
  categoricalCols: string[];
};

const AddChartModal: React.FC<AddChartModalProps> = ({
  open,
  onClose,
  onCreate,
  columns,
  numericCols,
  categoricalCols,
}) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<ChartType>("bar");
  const [xField, setXField] = useState<string>("");
  const [yField, setYField] = useState<string>("");
  const [agg, setAgg] = useState<AggType>("sum");

  // initialize sensible defaults whenever modal opens
  useEffect(() => {
    if (!open) return;
    setName("");
    setType("bar");
    setXField(categoricalCols[0] || columns[0] || "");
    setYField(numericCols[0] || "");
    setAgg("sum");
  }, [open, categoricalCols, numericCols, columns]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !xField) return;

    // for bar / line / donut we require a numeric yField
    if (
      (type === "bar" || type === "line" || type === "donut") &&
      !yField
    ) {
      return;
    }

    const baseConfig: Omit<ChartConfig, "id"> = {
      name: name.trim(),
      type,
      xField,
      yField,
      agg,
    };

    onCreate(baseConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Add Chart</h2>
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
              placeholder="Enter chart name"
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
                {/* if your chartTypes has more, you can add them here later */}
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
              Create Chart
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddChartModal;