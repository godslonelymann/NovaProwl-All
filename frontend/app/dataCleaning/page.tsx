"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useSessionStore } from "@/components/SessionStore";

import {
  Paperclip,
  SlidersHorizontal,
  ArrowLeft,
  Download,
  Trash2,
  Layers,
  ChevronDown,
} from "lucide-react";

type Row = Record<string, any>;

type Dataset = {
  id: string;
  fileName: string;
  original: Row[];
  current: Row[];
  history: { rows: Row[]; desc: string }[];
  columnsOrder: string[];
};

export default function DataCleaningPage() {
  const router = useRouter();
  const { sessions, setActiveSessionId } = useSessionStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [activeSpace, setActiveSpace] = useState<string>("Data Cleaning");
  const recentChats = sessions.map((s) => s.title);

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);

  const [filterQuery, setFilterQuery] = useState("");

  // cleaning dropdown local state
  const [missingAction, setMissingAction] = useState("");
  const [missingColumn, setMissingColumn] = useState("");
  const [missingConstant, setMissingConstant] = useState("");

  const [duplicateAction, setDuplicateAction] = useState("");
  const [dupColumns, setDupColumns] = useState<string[]>([]);
  const [filterColumn, setFilterColumn] = useState("");
  const [filterOp, setFilterOp] = useState("contains");
  const [filterValue, setFilterValue] = useState("");

  const [outlierColumn, setOutlierColumn] = useState("");
  const [outlierThreshold, setOutlierThreshold] = useState("3");

  const [rareColumn, setRareColumn] = useState("");
  const [rareMinCount, setRareMinCount] = useState("10");

  const [textAction, setTextAction] = useState("");
  const [textColumn, setTextColumn] = useState("");
  const [roundDecimals, setRoundDecimals] = useState("2");

  // dataset pill dropdown state
  const [datasetPickerOpen, setDatasetPickerOpen] = useState(false);
  const datasetPickerRef = useRef<HTMLDivElement | null>(null);

  const active = useMemo(
    () => datasets.find((ds) => ds.id === activeDatasetId) || null,
    [datasets, activeDatasetId]
  );

  // Close dataset dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        datasetPickerRef.current &&
        !datasetPickerRef.current.contains(e.target as Node)
      ) {
        setDatasetPickerOpen(false);
      }
    }
    if (datasetPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [datasetPickerOpen]);

  const addDataset = (ds: Dataset) => {
    setDatasets((prev) => [...prev, ds]);
    setActiveDatasetId(ds.id);
  };

  const updateDataset = (id: string, updater: (ds: Dataset) => Dataset) => {
    setDatasets((prev) =>
      prev.map((ds) => (ds.id === id ? updater(ds) : ds))
    );
  };

  const removeDataset = (id: string) => {
    setDatasets((prev) => prev.filter((ds) => ds.id !== id));
    if (activeDatasetId === id) setActiveDatasetId(null);
  };

  // --- file upload (CSV / Excel via ExcelJS) ---
  const handleFile = async (file: File) => {
    const name = file.name;
    const ext = name.split(".").pop()?.toLowerCase();
    let rows: Row[] = [];

    if (ext === "csv") {
      const text = await file.text();
      const parsed = Papa.parse<Row>(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
      });
      rows = parsed.data;
    } else if (ext === "xlsx" || ext === "xls") {
      const buf = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buf);
      const sheet = workbook.worksheets[0];
      if (!sheet) {
        alert("No sheet found in this Excel file.");
        return;
      }

      const headerRow = sheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell, colNumber) => {
        const raw = cell.value;
        headers[colNumber - 1] =
          typeof raw === "string"
            ? raw
            : raw != null
            ? String(raw)
            : `col_${colNumber}`;
      });

      const dataRows: Row[] = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const obj: Row = {};
        headers.forEach((h, idx) => {
          const cell = row.getCell(idx + 1);
          const v = cell.value;
          // @ts-ignore ExcelJS cell.value types
          if (v && typeof v === "object" && "text" in v) {
            obj[h] = v.text;
          } else {
            obj[h] = v;
          }
        });
        const nonEmpty = Object.values(obj).some(
          (v) => v !== null && v !== undefined && v !== ""
        );
        if (nonEmpty) dataRows.push(obj);
      });

      rows = dataRows;
    } else {
      alert("Unsupported file type: " + ext);
      return;
    }

    const ds: Dataset = {
      id: `${name}-${Date.now()}`,
      fileName: name,
      original: rows,
      current: rows,
      history: [],
      columnsOrder: rows.length ? Object.keys(rows[0]) : [],
    };
    addDataset(ds);
  };

  // --- basic cleaning operations ---
  const applyOperation = (desc: string, transform: (rows: Row[]) => Row[]) => {
    if (!active) return;
    updateDataset(active.id, (ds) => {
      const before = ds.current;
      const after = transform(before);
      return {
        ...ds,
        history: [...ds.history, { rows: before, desc }],
        current: after,
      };
    });
  };

  const dropMissing = () =>
    applyOperation("Drop rows with any missing values", (rows) =>
      rows.filter((r) =>
        Object.values(r).every(
          (v) => v !== null && v !== undefined && v !== ""
        )
      )
    );

  const dropAllMissing = () =>
    applyOperation("Drop rows where all values are missing", (rows) =>
      rows.filter((r) =>
        Object.values(r).some(
          (v) => v !== null && v !== undefined && v !== ""
        )
      )
    );

  const fillMissingWithZero = () =>
    applyOperation("Fill missing values with 0", (rows) =>
      rows.map((r) => {
        const newRow: any = {};
        for (const k of Object.keys(r)) {
          const v = r[k];
          newRow[k] = v === null || v === undefined || v === "" ? 0 : v;
        }
        return newRow;
      })
    );

  const fillMissingWithNA = () =>
    applyOperation(`Fill missing values with "N/A"`, (rows) =>
      rows.map((r) => {
        const newRow: any = {};
        for (const k of Object.keys(r)) {
          const v = r[k];
          newRow[k] = v === null || v === undefined || v === "" ? "N/A" : v;
        }
        return newRow;
      })
    );

  // ---- Advanced missing tools ----

  const dropRowsWhereColumnMissing = (col: string) =>
    applyOperation(`Drop rows where "${col}" is missing`, (rows) =>
      rows.filter((r) => {
        const v = r[col];
        return v !== null && v !== undefined && v !== "";
      })
    );

  const fillMissingInColumnConstant = (col: string, constant: any) =>
    applyOperation(
      `Fill missing in "${col}" with constant "${constant}"`,
      (rows) =>
        rows.map((r) => {
          const v = r[col];
          if (v === null || v === undefined || v === "") {
            return { ...r, [col]: constant };
          }
          return r;
        })
    );

  const getNumericValues = (rows: Row[], col: string): number[] =>
    rows
      .map((r) => r[col])
      .filter((v) => v !== null && v !== undefined && v !== "")
      .map((v) => Number(v))
      .filter((n) => !Number.isNaN(n));

  const fillMissingInColumnStat = (
    col: string,
    strategy: "mean" | "median" | "mode"
  ) =>
    applyOperation(
      `Fill missing in "${col}" with ${strategy}`,
      (rows) => {
        const values = getNumericValues(rows, col);
        if (!values.length) return rows;

        let replacement = values[0];

        if (strategy === "mean") {
          const sum = values.reduce((a, b) => a + b, 0);
          replacement = sum / values.length;
        } else if (strategy === "median") {
          const sorted = [...values].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          replacement =
            sorted.length % 2 === 0
              ? (sorted[mid - 1] + sorted[mid]) / 2
              : sorted[mid];
        } else if (strategy === "mode") {
          const freq: Record<string, number> = {};
          let best = values[0];
          let bestCount = 0;
          values.forEach((v) => {
            const key = String(v);
            freq[key] = (freq[key] || 0) + 1;
            if (freq[key] > bestCount) {
              bestCount = freq[key];
              best = v;
            }
          });
          replacement = best;
        }

        return rows.map((r) => {
          const v = r[col];
          if (v === null || v === undefined || v === "") {
            return { ...r, [col]: replacement };
          }
          return r;
        });
      }
    );

  const forwardFillColumn = (col: string) =>
    applyOperation(`Forward-fill missing values in "${col}"`, (rows) => {
      let lastSeen: any = null;
      return rows.map((r) => {
        const v = r[col];
        if (v !== null && v !== undefined && v !== "") {
          lastSeen = v;
          return r;
        }
        if (lastSeen !== null && lastSeen !== undefined && lastSeen !== "") {
          return { ...r, [col]: lastSeen };
        }
        return r;
      });
    });

  const backwardFillColumn = (col: string) =>
    applyOperation(`Backward-fill missing values in "${col}"`, (rows) => {
      const copy = [...rows];
      let nextSeen: any = null;
      for (let i = copy.length - 1; i >= 0; i--) {
        const v = copy[i][col];
        if (v !== null && v !== undefined && v !== "") {
          nextSeen = v;
        } else if (
          nextSeen !== null &&
          nextSeen !== undefined &&
          nextSeen !== ""
        ) {
          copy[i] = { ...copy[i], [col]: nextSeen };
        }
      }
      return copy;
    });

  const dropDuplicates = () =>
    applyOperation("Drop duplicate rows", (rows) => {
      const seen = new Set<string>();
      return rows.filter((r) => {
        const key = JSON.stringify(r);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });

  const dropDuplicatesByColumns = (cols: string[]) =>
    applyOperation(
      `Drop duplicate rows based on [${cols.join(", ")}]`,
      (rows) => {
        const seen = new Set<string>();
        return rows.filter((r) => {
          const key = JSON.stringify(
            cols.reduce((acc, c) => {
              acc[c] = r[c];
              return acc;
            }, {} as Row)
          );
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
    );

  const trimStrings = () =>
    applyOperation("Trim whitespace in text columns", (rows) =>
      rows.map((r) => {
        const newRow: any = {};
        for (const k of Object.keys(r)) {
          const v = r[k];
          newRow[k] = typeof v === "string" ? v.trim() : v;
        }
        return newRow;
      })
    );

  const lowercaseText = () =>
    applyOperation("Lowercase all text columns", (rows) =>
      rows.map((r) => {
        const newRow: any = {};
        for (const k of Object.keys(r)) {
          const v = r[k];
          newRow[k] = typeof v === "string" ? v.toLowerCase() : v;
        }
        return newRow;
      })
    );

  const uppercaseText = () =>
    applyOperation("UPPERCASE all text columns", (rows) =>
      rows.map((r) => {
        const newRow: any = {};
        for (const k of Object.keys(r)) {
          const v = r[k];
          newRow[k] = typeof v === "string" ? v.toUpperCase() : v;
        }
        return newRow;
      })
    );

  const titleCaseText = () =>
    applyOperation("Title Case all text columns", (rows) =>
      rows.map((r) => {
        const newRow: any = {};
        for (const k of Object.keys(r)) {
          const v = r[k];
          if (typeof v === "string") {
            newRow[k] = v
              .toLowerCase()
              .split(" ")
              .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
              .join(" ");
          } else {
            newRow[k] = v;
          }
        }
        return newRow;
      })
    );

  const trimExtraSpacesText = () =>
    applyOperation("Trim extra spaces inside text (normalize whitespace)", (rows) =>
      rows.map((r) => {
        const newRow: any = {};
        for (const k of Object.keys(r)) {
          const v = r[k];
          if (typeof v === "string") {
            newRow[k] = v.replace(/\s+/g, " ").trim();
          } else {
            newRow[k] = v;
          }
        }
        return newRow;
      })
    );

  const parseNumericColumn = (col: string) =>
    applyOperation(`Parse numeric values in "${col}"`, (rows) =>
      rows.map((r) => {
        const v = r[col];
        if (v === null || v === undefined || v === "") return r;
        const asString = String(v);
        const cleaned = asString.replace(/[^0-9.\-]/g, "");
        const n = Number(cleaned);
        if (Number.isNaN(n)) return r;
        return { ...r, [col]: n };
      })
    );

  const roundNumericColumn = (col: string, places: number) =>
    applyOperation(
      `Round "${col}" to ${places} decimal place${places === 1 ? "" : "s"}`,
      (rows) =>
        rows.map((r) => {
          const v = r[col];
          const n = Number(v);
          if (Number.isNaN(n)) return r;
          const factor = Math.pow(10, places);
          const rounded = Math.round(n * factor) / factor;
          return { ...r, [col]: rounded };
        })
    );

  const clipOutliersZScore = (col: string, threshold: number) =>
    applyOperation(
      `Drop outliers in "${col}" using z-score > ${threshold}`,
      (rows) => {
        const values = getNumericValues(rows, col);
        if (values.length < 2) return rows;
        const mean =
          values.reduce((a, b) => a + b, 0) / values.length;
        const variance =
          values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
          (values.length - 1);
        const std = Math.sqrt(variance || 0);
        if (!std || std === 0) return rows;

        return rows.filter((r) => {
          const v = Number(r[col]);
          if (Number.isNaN(v)) return true;
          const z = Math.abs((v - mean) / std);
          return z <= threshold;
        });
      }
    );

  const filterRowsByCondition = (
    col: string,
    op: string,
    value: string
  ) =>
    applyOperation(
      `Filter rows: ${col} ${op} "${value}"`,
      (rows) =>
        rows.filter((r) => {
          const v = r[col];
          const s = String(v ?? "");
          if (op === "contains") {
            return s.toLowerCase().includes(value.toLowerCase());
          }
          if (op === "=") {
            return s === value;
          }
          if (op === "!=") {
            return s !== value;
          }
          const numV = Number(v);
          const numVal = Number(value);
          if (Number.isNaN(numV) || Number.isNaN(numVal)) return false;
          if (op === ">") return numV > numVal;
          if (op === "<") return numV < numVal;
          if (op === ">=") return numV >= numVal;
          if (op === "<=") return numV <= numVal;
          return true;
        })
    );

  const groupRareCategories = (col: string, minCount: number) =>
    applyOperation(
      `Group rare categories in "${col}" into "Other" (count < ${minCount})`,
      (rows) => {
        const freq: Record<string, number> = {};
        rows.forEach((r) => {
          const key = String(r[col] ?? "");
          freq[key] = (freq[key] || 0) + 1;
        });
        return rows.map((r) => {
          const key = String(r[col] ?? "");
          const count = freq[key] || 0;
          if (count > 0 && count < minCount) {
            return { ...r, [col]: "Other" };
          }
          return r;
        });
      }
    );

  const convertColumnToDate = (col: string) =>
    applyOperation(
      `Convert "${col}" to date (YYYY-MM-DD)`,
      (rows) =>
        rows.map((r) => {
          const v = r[col];
          if (!v && v !== 0) return r;
          const d = new Date(v as any);
          if (isNaN(d.getTime())) return r;
          const iso = d.toISOString().slice(0, 10);
          return { ...r, [col]: iso };
        })
    );

  const undo = () => {
    if (!active) return;
    updateDataset(active.id, (ds) => {
      if (!ds.history.length) return ds;
      const last = ds.history[ds.history.length - 1];
      return {
        ...ds,
        current: last.rows,
        history: ds.history.slice(0, -1),
      };
    });
  };

  // --- manual cell editing ---
  const editCell = (rowIndex: number, col: string, newValue: any) => {
    if (!active) return;
    updateDataset(active.id, (ds) => {
      const before = ds.current;
      const updatedRows = before.map((r, i) =>
        i === rowIndex ? { ...r, [col]: newValue } : r
      );
      return {
        ...ds,
        history: [
          ...ds.history,
          { rows: before, desc: `Edit "${col}" at row ${rowIndex + 1}` },
        ],
        current: updatedRows,
      };
    });
  };

  // --- header rename ---
  const renameColumn = (oldName: string, newName: string) => {
    if (!active) return;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;

    updateDataset(active.id, (ds) => {
      const before = ds.current;
      const renamedRows = before.map((r) => {
        const newRow: any = { ...r, [trimmed]: r[oldName] };
        delete newRow[oldName];
        return newRow;
      });

      return {
        ...ds,
        history: [
          ...ds.history,
          { rows: before, desc: `Rename column "${oldName}" → "${trimmed}"` },
        ],
        current: renamedRows,
        columnsOrder: ds.columnsOrder.map((c) =>
          c === oldName ? trimmed : c
        ),
      };
    });
  };

  // --- add/delete rows ---
  const addRow = () => {
    if (!active) return;
    updateDataset(active.id, (ds) => {
      const before = ds.current;
      const cols =
        ds.columnsOrder.length > 0
          ? ds.columnsOrder
          : before.length > 0
          ? Object.keys(before[0])
          : [];

      const newRow: Row = {};
      cols.forEach((c) => {
        newRow[c] = "";
      });

      const updatedRows = [...before, newRow];
      return {
        ...ds,
        history: [...ds.history, { rows: before, desc: "Add new row" }],
        current: updatedRows,
      };
    });
  };

  const deleteRow = (rowIndex: number) => {
    if (!active) return;
    updateDataset(active.id, (ds) => {
      const before = ds.current;
      if (rowIndex < 0 || rowIndex >= before.length) return ds;
      const updatedRows = before.filter((_, idx) => idx !== rowIndex);
      return {
        ...ds,
        history: [
          ...ds.history,
          { rows: before, desc: `Delete row ${rowIndex + 1}` },
        ],
        current: updatedRows,
      };
    });
  };

  // --- merge datasets ---
  const mergeDatasets = (ids: string[]) => {
    if (ids.length < 2) {
      alert("Select at least two datasets to merge");
      return;
    }

    const allRows: Row[] = [];
    const columnsSet = new Set<string>();

    ids.forEach((id) => {
      const ds = datasets.find((d) => d.id === id);
      if (!ds) return;
      ds.current.forEach((r) => allRows.push({ ...r }));
      if (ds.current.length) {
        Object.keys(ds.current[0]).forEach((c) => columnsSet.add(c));
      }
    });

    const merged: Dataset = {
      id: `merged-${Date.now()}`,
      fileName: `merged_${ids.join("_")}`,
      original: allRows,
      current: allRows,
      history: [],
      columnsOrder: Array.from(columnsSet),
    };
    addDataset(merged);
  };

  // --- export cleaned dataset ---
  const exportCSV = () => {
    if (!active) return;
    const csv = Papa.unparse(active.current);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = active.fileName.replace(/\.\w+$/, "") + "_cleaned.csv";
    link.click();
  };

  const exportExcel = async () => {
    if (!active) return;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");

    const cols = active.columnsOrder.length
      ? active.columnsOrder
      : active.current.length
      ? Object.keys(active.current[0])
      : [];

    sheet.addRow(cols);
    active.current.forEach((row) => {
      sheet.addRow(cols.map((c) => row[c] ?? ""));
    });

    const buf = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = active.fileName.replace(/\.\w+$/, "") + "_cleaned.xlsx";
    a.click();
  };

  // --- column types for badges ---
  const columnTypes = useMemo(() => {
    if (!active) return {} as Record<string, "string" | "number" | "date">;
    const rows = active.current;
    const cols =
      active.columnsOrder.length > 0
        ? active.columnsOrder
        : rows.length > 0
        ? Object.keys(rows[0])
        : [];

    const result: Record<string, "string" | "number" | "date"> = {};

    cols.forEach((col) => {
      const values = rows
        .map((r) => r[col])
        .filter((v) => v !== null && v !== undefined && v !== "");
      let type: "string" | "number" | "date" = "string";

      if (
        values.length &&
        values.every((v) => {
          if (typeof v === "number") return true;
          if (typeof v === "string") {
            const n = Number(v);
            return !Number.isNaN(n) && v.trim() !== "";
          }
          return false;
        })
      ) {
        type = "number";
      }

      if (values.length) {
        let dateCount = 0;
        values.forEach((v) => {
          if (v instanceof Date) {
            if (!isNaN(v.getTime())) dateCount++;
          } else if (typeof v === "string" || typeof v === "number") {
            const d = new Date(v as any);
            if (!isNaN(d.getTime())) dateCount++;
          }
        });
        if (dateCount > 0 && dateCount === values.length) {
          type = "date";
        }
      }

      result[col] = type;
    });

    return result;
  }, [active]);

  // --- filter / search ---
  const filteredRows = useMemo(() => {
    if (!active) return [];
    if (!filterQuery.trim()) return active.current;
    const q = filterQuery.toLowerCase();
    return active.current.filter((row) =>
      Object.values(row).some((v) =>
        String(v ?? "").toLowerCase().includes(q)
      )
    );
  }, [active, filterQuery]);

  // --- cleaning APPLY handlers (no prompts) ---

  const handleMissingApply = () => {
    if (!active || !missingAction) return;

    if (missingAction === "drop_any") {
      dropMissing();
    } else if (missingAction === "drop_all") {
      dropAllMissing();
    } else if (missingAction === "fill_zero") {
      fillMissingWithZero();
    } else if (missingAction === "fill_na") {
      fillMissingWithNA();
    } else {
      // column-based actions
      if (!missingColumn) {
        alert("Please select a column for this action.");
        return;
      }

      if (missingAction === "drop_col_missing") {
        dropRowsWhereColumnMissing(missingColumn);
      } else if (missingAction === "fill_col_constant") {
        fillMissingInColumnConstant(missingColumn, missingConstant);
      } else if (missingAction === "fill_col_mean") {
        fillMissingInColumnStat(missingColumn, "mean");
      } else if (missingAction === "fill_col_median") {
        fillMissingInColumnStat(missingColumn, "median");
      } else if (missingAction === "fill_col_mode") {
        fillMissingInColumnStat(missingColumn, "mode");
      } else if (missingAction === "ffill_col") {
        forwardFillColumn(missingColumn);
      } else if (missingAction === "bfill_col") {
        backwardFillColumn(missingColumn);
      }
    }
  };

  const handleDuplicateApply = () => {
    if (!active || !duplicateAction) return;

    if (duplicateAction === "drop_dupes") {
      dropDuplicates();
      return;
    }

    if (duplicateAction === "drop_dupes_cols") {
      if (!dupColumns.length) {
        alert("Select at least one column for duplicate detection.");
        return;
      }
      dropDuplicatesByColumns(dupColumns);
      return;
    }

    if (duplicateAction === "filter_rows") {
      if (!filterColumn) {
        alert("Select a column for filtering.");
        return;
      }
      filterRowsByCondition(filterColumn, filterOp, filterValue || "");
      return;
    }

    if (duplicateAction === "clip_outliers") {
      if (!outlierColumn) {
        alert("Select a numeric column for outlier removal.");
        return;
      }
      const thr = Number(outlierThreshold);
      if (Number.isNaN(thr) || thr <= 0) {
        alert("Enter a valid positive threshold.");
        return;
      }
      clipOutliersZScore(outlierColumn, thr);
      return;
    }

    if (duplicateAction === "group_rare") {
      if (!rareColumn) {
        alert("Select a column for grouping rare categories.");
        return;
      }
      const min = Number(rareMinCount);
      if (Number.isNaN(min) || min <= 0) {
        alert("Enter a valid positive minimum count.");
        return;
      }
      groupRareCategories(rareColumn, min);
      return;
    }
  };

  const handleTextApply = () => {
    if (!active || !textAction) return;

    if (textAction === "trim") {
      trimStrings();
      return;
    }
    if (textAction === "lower") {
      lowercaseText();
      return;
    }
    if (textAction === "upper") {
      uppercaseText();
      return;
    }
    if (textAction === "title") {
      titleCaseText();
      return;
    }
    if (textAction === "trim_extra") {
      trimExtraSpacesText();
      return;
    }

    // actions that need a column
    if (!textColumn) {
      alert("Select a column for this action.");
      return;
    }

    if (textAction === "parse_numeric") {
      parseNumericColumn(textColumn);
    } else if (textAction === "round_numeric") {
      const places = Number(roundDecimals);
      if (Number.isNaN(places) || places < 0) {
        alert("Enter a valid number of decimal places.");
        return;
      }
      roundNumericColumn(textColumn, places);
    } else if (textAction === "to_date") {
      convertColumnToDate(textColumn);
    }
  };

  const allColumns = active?.columnsOrder || [];

  return (
    <div className="h-screen bg-[#f4f2ee] text-slate-800 flex overflow-hidden">
      {/* Global sidebar */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        accountOpen={accountOpen}
        setAccountOpen={setAccountOpen}
        recentChats={recentChats}
        activeSpace={activeSpace}
        onSpaceChange={(label) => {
          setActiveSpace(label);
          if (label === "Chat") {
            setActiveSessionId(null);
            router.push("/");
          }
          if (label === "Explore") {
            router.push("/analysis");
          }
        }}
        onSelectChat={(chatTitle) => {
          const session = sessions.find((s) => s.title === chatTitle);
          if (!session) return;
          setActiveSessionId(session.id);
          router.push("/analysis");
        }}
      />

      {/* Main layout */}
      <main className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
          <div className="flex flex-col">
            
            <h1 className="text-xl font-semibold text-slate-900">
              Data Cleaning Tool
            </h1>
            <p className="text-xs text-slate-500">
              Clean and Prepare your Dataset(s)
            </p>
          </div>
          <button
            onClick={() => router.push("/mainInterface")}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-medium hover:bg-slate-800"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col px-6 lg:px-8 py-4 gap-3 overflow-hidden min-h-0">
          {/* TOP: Upload + dataset pill dropdown + history */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-4 py-3 flex flex-col gap-3 flex-shrink-0">
            {/* Row 1: upload + active dataset meta + export */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* Upload at top-left */}
                <label className="inline-flex items-center px-3 py-2 border border-slate-300 bg-white rounded-xl cursor-pointer hover:bg-slate-50 text-xs font-medium text-slate-700">
                  <Paperclip className="w-3 h-3 mr-1.5" />
                  <span>Upload CSV / Excel</span>
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                </label>
                <span className="text-[10px] text-slate-400">
                  Supported: .csv, .xlsx, .xls
                </span>
              </div>

              <div className="flex items-center gap-3">
                {active && (
                  <>
                    <span className="text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-900">
                        {active.fileName}
                      </span>{" "}
                      · {active.current.length.toLocaleString()} rows ·{" "}
                      {active.columnsOrder.length} columns
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-[11px] font-medium"
                        onClick={exportCSV}
                      >
                        <Download className="w-3 h-3" />
                        CSV
                      </button>
                      <button
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-[11px] font-medium"
                        onClick={exportExcel}
                      >
                        <Download className="w-3 h-3" />
                        Excel
                      </button>
                    </div>
                  </>
                )}
                {!active && (
                  <span className="text-[11px] text-slate-500">
                    No dataset selected. Upload a file to get started.
                  </span>
                )}
              </div>
            </div>

            {/* Row 2: dataset pill container + merge */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                {datasets.length > 0 ? (
                  <div className="relative inline-block" ref={datasetPickerRef}>
                    <button
                      type="button"
                      onClick={() =>
                        setDatasetPickerOpen((open) => !open)
                      }
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-700 max-w-[240px]"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span className="truncate">
                        {active?.fileName || "Select dataset"}
                      </span>
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    </button>

                    {datasetPickerOpen && (
                      <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-[0_18px_40px_rgba(15,23,42,0.12)] py-2 z-40 max-h-64 overflow-y-auto">
                        {datasets.map((ds) => (
                          <button
                            key={ds.id}
                            type="button"
                            onClick={() => {
                              setActiveDatasetId(ds.id);
                              setDatasetPickerOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-50 ${
                              ds.id === activeDatasetId
                                ? "bg-slate-100 font-semibold"
                                : ""
                            }`}
                          >
                            <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                            <span className="truncate">{ds.fileName}</span>
                            <span className="ml-auto text-[10px] text-slate-400">
                              {ds.current.length.toLocaleString()} rows
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Uploaded datasets will appear in a picker here.
                  </span>
                )}
              </div>

              {/* Merge datasets, small inline */}
              {datasets.length > 1 && (
                <div className="flex-shrink-0">
                  <MergeSelector datasets={datasets} onMerge={mergeDatasets} />
                </div>
              )}
            </div>

            {/* Row 3: history strip (vertical, scrollable) */}
            <div className="border-t border-slate-100 pt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-slate-700">
                  Change history
                </span>
                <button
                  onClick={undo}
                  className="px-3 py-1 rounded-full border border-slate-300 text-[10px] font-medium hover:bg-slate-50"
                >
                  Undo last change
                </button>
              </div>
              {active && active.history.length > 0 ? (
                <ul className="space-y-1 max-h-20 overflow-y-auto text-[10px] text-slate-600 pr-1">
                  {active.history
                    .slice()
                    .reverse()
                    .map((h, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="mt-[3px] h-1 w-1 rounded-full bg-slate-400" />
                        <span>{h.desc}</span>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-[10px] text-slate-400">
                  No changes yet. Apply a cleaning action or edit a cell.
                </p>
              )}
            </div>
          </div>

          {/* MAIN: 2 columns (left: cleaning, right: table) */}
          <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
            {/* LEFT: Cleaning actions (vertical) */}
            <section className="w-72 flex-none rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col p-4 min-h-0 overflow-y-auto">
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Cleaning actions
                </h2>
                <p className="text-[11px] text-slate-500">
                  These tools modify your data. Actions are tracked in history
                  and can be undone.
                </p>
              </div>

              <div className="items-stretch flex flex-col gap-3 text-[11px]">
                {/* Missing values */}
                <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">
                      Missing values
                    </span>
                    <span className="text-[10px] text-slate-500">
                      NULL / blank cells
                    </span>
                  </div>
                  <select
                    className="border border-slate-300 rounded-lg px-2 py-1 text-[11px] bg-white"
                    value={missingAction}
                    onChange={(e) => setMissingAction(e.target.value)}
                    disabled={!active}
                  >
                    <option value="">
                      {active ? "Select action…" : "Select dataset first"}
                    </option>
                    <option value="drop_any">
                      Drop rows with any missing value
                    </option>
                    <option value="drop_all">
                      Drop rows where all values are missing
                    </option>
                    <option value="fill_zero">Fill missing with 0</option>
                    <option value="fill_na">Fill missing with "N/A"</option>
                    <option value="drop_col_missing">
                      Drop rows where specific column is missing
                    </option>
                    <option value="fill_col_constant">
                      Fill missing in column (constant)
                    </option>
                    <option value="fill_col_mean">
                      Fill missing in column (mean)
                    </option>
                    <option value="fill_col_median">
                      Fill missing in column (median)
                    </option>
                    <option value="fill_col_mode">
                      Fill missing in column (mode)
                    </option>
                    <option value="ffill_col">
                      Forward fill column (carry previous)
                    </option>
                    <option value="bfill_col">
                      Backward fill column (carry next)
                    </option>
                  </select>

                  {/* Column + constant controls for column-based actions */}
                  {active && missingAction && (
                    <>
                      {[
                        "drop_col_missing",
                        "fill_col_constant",
                        "fill_col_mean",
                        "fill_col_median",
                        "fill_col_mode",
                        "ffill_col",
                        "bfill_col",
                      ].includes(missingAction) && (
                        <select
                          className="border border-slate-300 rounded-lg px-2 py-1 text-[11px] bg-white"
                          value={missingColumn}
                          onChange={(e) => setMissingColumn(e.target.value)}
                        >
                          <option value="">Select column…</option>
                          {allColumns.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      )}

                      {missingAction === "fill_col_constant" && (
                        <input
                          type="text"
                          className="border border-slate-300 rounded-lg px-2 py-1 text-[11px]"
                          placeholder="Constant value to fill"
                          value={missingConstant}
                          onChange={(e) =>
                            setMissingConstant(e.target.value)
                          }
                        />
                      )}
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleMissingApply}
                    disabled={!active || !missingAction}
                    className={`mt-1 inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-[11px] font-medium ${
                      !active || !missingAction
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    Apply missing value action
                  </button>
                </div>

                {/* Duplicates & quality */}
                <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">
                      Duplicates & quality
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Row-level cleanup
                    </span>
                  </div>
                  <select
                    className="border border-slate-300 rounded-lg px-2 py-1 text-[11px] bg-white"
                    value={duplicateAction}
                    onChange={(e) => setDuplicateAction(e.target.value)}
                    disabled={!active}
                  >
                    <option value="">
                      {active ? "Select action…" : "Select dataset first"}
                    </option>
                    <option value="drop_dupes">
                      Drop duplicate rows (keep first)
                    </option>
                    <option value="drop_dupes_cols">
                      Drop duplicates by selected columns
                    </option>
                    <option value="filter_rows">
                      Filter rows by condition
                    </option>
                    <option value="clip_outliers">
                      Drop numeric outliers (z-score)
                    </option>
                    <option value="group_rare">
                      Group rare categories into "Other"
                    </option>
                  </select>

                  {active && duplicateAction === "drop_dupes_cols" && (
                    <select
                      multiple
                      className="border border-slate-300 rounded-lg px-2 py-1 text-[11px] bg-white h-20"
                      value={dupColumns}
                      onChange={(e) => {
                        const selected = Array.from(
                          (e.target as HTMLSelectElement).selectedOptions
                        ).map((o) => o.value);
                        setDupColumns(selected);
                      }}
                    >
                      {allColumns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}

                  {active && duplicateAction === "filter_rows" && (
                    <div className="flex flex-col gap-1">
                      <select
                        className="border border-slate-300 rounded-lg px-2 py-1 text-[11px] bg-white"
                        value={filterColumn}
                        onChange={(e) => setFilterColumn(e.target.value)}
                      >
                        <option value="">Column…</option>
                        {allColumns.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-1">
                        <select
                          className="border border-slate-300 rounded-lg px-2 py-1 text-[11px] bg-white w-24"
                          value={filterOp}
                          onChange={(e) => setFilterOp(e.target.value)}
                        >
                          <option value="contains">contains</option>
                          <option value="=">=</option>
                          <option value="!=">!=</option>
                          <option value=">">&gt;</option>
                          <option value="<">&lt;</option>
                          <option value=">=">&gt;=</option>
                          <option value="<=">&lt;=</option>
                        </select>
                        <input
                          type="text"
                          className="border border-slate-300 rounded-lg px-2 py-1 text-[11px] flex-1"
                          placeholder="Value…"
                          value={filterValue}
                          onChange={(e) => setFilterValue(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {active && duplicateAction === "clip_outliers" && (
                    <div className="flex flex-col gap-1">
                      <select
                        className="border border-slate-300 rounded-lg px-2 py-1 text-[11px] bg-white"
                        value={outlierColumn}
                        onChange={(e) => setOutlierColumn(e.target.value)}
                      >
                        <option value="">Numeric column…</option>
                        {allColumns.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        className="border border-slate-300 rounded-lg px-2 py-1 text-[11px]"
                        placeholder="Z-score threshold (e.g. 3)"
                        value={outlierThreshold}
                        onChange={(e) =>
                          setOutlierThreshold(e.target.value)
                        }
                      />
                    </div>
                  )}

                  {active && duplicateAction === "group_rare" && (
                    <div className="flex flex-col gap-1">
                      <select
                        className="border border-slate-300 rounded-lg px-2 py-1 text-[11px] bg-white"
                        value={rareColumn}
                        onChange={(e) => setRareColumn(e.target.value)}
                      >
                        <option value="">Column…</option>
                        {allColumns.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        className="border border-slate-300 rounded-lg px-2 py-1 text-[11px]"
                        placeholder='Min count to avoid "Other" (e.g. 10)'
                        value={rareMinCount}
                        onChange={(e) =>
                          setRareMinCount(e.target.value)
                        }
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleDuplicateApply}
                    disabled={!active || !duplicateAction}
                    className={`mt-1 inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-[11px] font-medium ${
                      !active || !duplicateAction
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    Apply duplicate / quality action
                  </button>
                </div>

                {/* Text & numeric cleanup */}
                <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">
                      Text & numeric cleanup
                    </span>
                    <span className="text-[10px] text-slate-500">
                      String / number tools
                    </span>
                  </div>
                  <select
                    className="border border-slate-300 rounded-lg px-2 py-1 text-[11px] bg-white"
                    value={textAction}
                    onChange={(e) => setTextAction(e.target.value)}
                    disabled={!active}
                  >
                    <option value="">
                      {active ? "Select action…" : "Select dataset first"}
                    </option>
                    <option value="trim">
                      Trim spaces (start / end, all text)
                    </option>
                    <option value="lower">
                      Convert all text to lowercase
                    </option>
                    <option value="upper">
                      Convert all text to UPPERCASE
                    </option>
                    <option value="title">
                      Convert all text to Title Case
                    </option>
                    <option value="trim_extra">
                      Trim extra spaces inside text
                    </option>
                    <option value="parse_numeric">
                      Parse numeric column from strings
                    </option>
                    <option value="round_numeric">
                      Round numeric column to decimals
                    </option>
                    <option value="to_date">
                      Convert column to date (YYYY-MM-DD)
                    </option>
                  </select>

                  {active &&
                    ["parse_numeric", "round_numeric", "to_date"].includes(
                      textAction
                    ) && (
                      <>
                        <select
                          className="border border-slate-300 rounded-lg px-2 py-1 text-[11px] bg-white"
                          value={textColumn}
                          onChange={(e) =>
                            setTextColumn(e.target.value)
                          }
                        >
                          <option value="">Select column…</option>
                          {allColumns.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        {textAction === "round_numeric" && (
                          <input
                            type="number"
                            className="border border-slate-300 rounded-lg px-2 py-1 text-[11px]"
                            placeholder="Decimal places (e.g. 2)"
                            value={roundDecimals}
                            onChange={(e) =>
                              setRoundDecimals(e.target.value)
                            }
                          />
                        )}
                      </>
                    )}

                  <button
                    type="button"
                    onClick={handleTextApply}
                    disabled={!active || !textAction}
                    className={`mt-1 inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-[11px] font-medium ${
                      !active || !textAction
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    Apply text / numeric action
                  </button>
                </div>
              </div>
            </section>

            {/* RIGHT: Edit table (full right column) */}
            <section className="flex-1 flex flex-col rounded-2xl bg-white border border-slate-200 shadow-sm p-4 overflow-hidden min-h-0">
              {!active && datasets.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center max-w-sm">
                    <Layers className="w-8 h-8 mx-auto mb-3 text-slate-400" />
                    <p className="text-sm font-medium text-slate-800 mb-1">
                      Start by uploading a dataset
                    </p>
                    <p className="text-xs text-slate-500">
                      Use the upload button at the top to add CSV or Excel
                      files. They will appear in the dataset picker.
                    </p>
                  </div>
                </div>
              )}

              {active && (
                <>
                  <div className="flex items-center justify-between mb-2 gap-2 flex-shrink-0">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        Edit data (spreadsheet mode)
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Double-click a cell to edit. Click a column header to
                        rename. Use the trash icon to delete rows.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Filter rows…"
                        value={filterQuery}
                        onChange={(e) => setFilterQuery(e.target.value)}
                        className="border border-slate-300 rounded-lg px-2 py-1 text-[11px] w-40"
                      />
                      <button
                        onClick={addRow}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-medium hover:bg-indigo-700"
                      >
                        + Add row
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-1 flex-shrink-0">
                    <span className="text-[10px] text-slate-500">
                      Showing first{" "}
                      <span className="font-semibold">
                        {Math.min(200, filteredRows.length).toLocaleString()}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold">
                        {filteredRows.length.toLocaleString()}
                      </span>{" "}
                      row{filteredRows.length === 1 ? "" : "s"}
                      {filterQuery.trim()
                        ? " (filtered)"
                        : filteredRows.length > 200
                        ? " (scroll to see more)"
                        : ""}
                      .
                    </span>
                    {filterQuery.trim() && (
                      <button
                        onClick={() => setFilterQuery("")}
                        className="text-[10px] text-slate-500 underline underline-offset-2"
                      >
                        Clear filter
                      </button>
                    )}
                  </div>

                  <EditableDataTable
                    rows={filteredRows}
                    columns={active.columnsOrder}
                    columnTypes={columnTypes}
                    onEdit={editCell}
                    onRenameColumn={renameColumn}
                    onDeleteRow={deleteRow}
                  />
                </>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

/* --- Sub-components --- */

function MergeSelector({
  datasets,
  onMerge,
}: {
  datasets: Dataset[];
  onMerge: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const anySelected = selected.size >= 2;

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center gap-1 text-[11px] text-slate-500">
        <Layers className="w-3 h-3" />
        <span>Merge</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {datasets.map((ds) => (
          <label
            key={ds.id}
            className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 border border-slate-200 text-[10px] text-slate-700"
          >
            <input
              type="checkbox"
              className="rounded border-slate-300"
              checked={selected.has(ds.id)}
              onChange={(e) => toggle(ds.id, e.target.checked)}
            />
            <span className="truncate max-w-[90px]">{ds.fileName}</span>
          </label>
        ))}
      </div>
      <button
        disabled={!anySelected}
        onClick={() => onMerge(Array.from(selected))}
        className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${
          anySelected
            ? "bg-indigo-600 text-white hover:bg-indigo-700"
            : "bg-slate-200 text-slate-500 cursor-not-allowed"
        }`}
      >
        Merge
      </button>
    </div>
  );
}

function EditableDataTable({
  rows,
  columns,
  columnTypes,
  onEdit,
  onRenameColumn,
  onDeleteRow,
}: {
  rows: Row[];
  columns: string[];
  columnTypes: Record<string, "string" | "number" | "date">;
  onEdit: (rowIndex: number, column: string, newValue: any) => void;
  onRenameColumn: (oldName: string, newName: string) => void;
  onDeleteRow: (rowIndex: number) => void;
}) {
  const [editingCell, setEditingCell] = useState<{
    row: number;
    col: string;
  } | null>(null);
  const [cellValue, setCellValue] = useState("");
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [headerValue, setHeaderValue] = useState("");

  const effectiveColumns =
    columns.length > 0
      ? columns
      : rows.length > 0
      ? Object.keys(rows[0])
      : [];

  return (
    <div className="flex-1 overflow-y-auto overflow-x-auto border border-slate-200 rounded-xl">
      <table className="min-w-full text-[11px]">
        <thead className="bg-slate-50 sticky top-0 z-10">
          <tr>
            {effectiveColumns.map((col) => {
              const isHeaderEditing = editingHeader === col;
              const typeBadge = columnTypes[col] ?? "string";
              return (
                <th
                  key={col}
                  className="px-3 py-2 border-b border-slate-200 text-left font-medium text-slate-700 whitespace-nowrap"
                >
                  {isHeaderEditing ? (
                    <div className="flex flex-col gap-1">
                      <input
                        autoFocus
                        value={headerValue}
                        onChange={(e) => setHeaderValue(e.target.value)}
                        onBlur={() => {
                          if (headerValue.trim()) {
                            onRenameColumn(col, headerValue);
                          }
                          setEditingHeader(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (headerValue.trim()) {
                              onRenameColumn(col, headerValue);
                            }
                            setEditingHeader(null);
                          }
                          if (e.key === "Escape") {
                            setEditingHeader(null);
                          }
                        }}
                        className="w-full border border-slate-400 rounded px-1 py-0.5 text-[11px] bg-white"
                      />
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-slate-100 text-[9px] text-slate-500 capitalize w-fit">
                        {typeBadge}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingHeader(col);
                          setHeaderValue(col);
                        }}
                        className="text-left truncate hover:text-slate-900 max-w-[140px]"
                        title="Click to rename column"
                      >
                        {col}
                      </button>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-slate-100 text-[9px] text-slate-500 capitalize">
                        {typeBadge}
                      </span>
                    </div>
                  )}
                </th>
              );
            })}
            <th className="px-2 py-2 border-b border-slate-200 text-left font-medium text-slate-700 whitespace-nowrap">
              Row
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 200).map((row, rIndex) => (
            <tr
              key={rIndex}
              className={rIndex % 2 === 0 ? "bg-white" : "bg-slate-50/40"}
            >
              {effectiveColumns.map((col) => {
                const isEditing =
                  editingCell?.row === rIndex && editingCell?.col === col;
                return (
                  <td
                    key={col}
                    className="px-3 py-1.5 border-b border-slate-100 whitespace-nowrap max-w-[180px] overflow-hidden text-ellipsis cursor-pointer"
                    onDoubleClick={() => {
                      setEditingCell({ row: rIndex, col });
                      setCellValue(
                        row[col] !== undefined && row[col] !== null
                          ? String(row[col])
                          : ""
                      );
                    }}
                  >
                    {isEditing ? (
                      <input
                        autoFocus
                        value={cellValue}
                        onChange={(e) => setCellValue(e.target.value)}
                        onBlur={() => {
                          onEdit(rIndex, col, cellValue);
                          setEditingCell(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            onEdit(rIndex, col, cellValue);
                            setEditingCell(null);
                          }
                          if (e.key === "Escape") {
                            setEditingCell(null);
                          }
                        }}
                        className="w-full border border-slate-400 rounded px-1 py-0.5 text-[11px] bg-white"
                      />
                    ) : (
                      <span className="block">
                        {row[col] !== undefined && row[col] !== null
                          ? String(row[col])
                          : ""}
                      </span>
                    )}
                  </td>
                );
              })}
              <td className="px-2 py-1.5 border-b border-slate-100 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => onDeleteRow(rIndex)}
                  className="inline-flex items-center justify-center p-1 rounded-full hover:bg-red-50 text-red-500"
                  title="Delete row"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={effectiveColumns.length + 1}
                className="px-3 py-3 text-center text-[11px] text-slate-500"
              >
                No rows in this dataset (maybe all rows were removed by
                cleaning).
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}