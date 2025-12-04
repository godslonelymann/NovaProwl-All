"use client";

import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
  KeyboardEvent,
} from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import {
  ArrowUp,
  Check,
  Copy,
  Sparkles,
  User,
  Bot,
  Code2,
  FileText,
  PlusIcon,
  X,
  MessageCircle,
  Paperclip,      // 🔹 dataset pill
  ChevronDown,    // 🔹 dataset pill dropdown
} from "lucide-react";

import Papa from "papaparse";          // 🔹 for CSV
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import GlobalFilters from "./GlobalFilters";
import KPISection from "./KPISection";
import DashboardSection from "./Dashboard/DashboardSection";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

type Row = Record<string, any>;

// 🔹 local dataset model for AnalysisPanel
type UploadedDataset = {
  id: string;
  fileName: string;
  rows: Row[];
};

type AnalysisPanelProps = {
  fileName: string;
  data: Row[];
  initialPrompt?: string;
  datasets?: UploadedDataset[]; // optional: passed from /analysis page
};

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: number;
  role: ChatRole;
  content: string;
};

// 🔹 Types mirroring backend query.ts
type KPIFormat = "number" | "currency" | "percentage" | "duration" | "custom";

type BackendKPI = {
  id?: string;
  label: string;
  value: number;
  format?: KPIFormat;
  unit?: string;
  trend?: string;
  description?: string;
};

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

type BackendChart = {
  id?: string;
  title: string;
  type: ChartType;
  xField: string;
  yField?: string;
  agg?: AggregationType;
  description?: string;
};

// 🔹 storage keys for this analysis view
const STORAGE_MESSAGES_KEY = "analysis_messages";

// 🔹 backend base URL
const BACKEND =
  (process.env.NEXT_PUBLIC_BACKEND || "http://localhost:8000").replace(
    /\/+$/,
    ""
  );

export default function AnalysisPanel({
  fileName,
  data,
  initialPrompt,
  datasets,
}: AnalysisPanelProps) {
  const router = useRouter();

  // Nova sidebar state (outer app sidebar)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);

  const [recentChats] = useState<string[]>([]);
  const [activeSpace, setActiveSpace] = useState<string>("Chat");

  // ------------------------------------------------------------------
  // 🔹 MULTI-DATASET SUPPORT
  //    - If /analysis provides a datasets[] prop, use that
  //    - Otherwise, bootstrap with the single dataset from props
  // ------------------------------------------------------------------
  const [uploadedDatasets, setUploadedDatasets] = useState<UploadedDataset[]>(
    () => {
      if (datasets && datasets.length) return datasets;
      return [
        {
          id: "primary-dataset",
          fileName: fileName || "Dataset",
          rows: data || [],
        },
      ];
    }
  );

  const [activeDatasetId, setActiveDatasetId] = useState<string>(
    uploadedDatasets[0]?.id
  );

  const activeDataset = useMemo(
    () =>
      uploadedDatasets.find((ds) => ds.id === activeDatasetId) ||
      uploadedDatasets[0],
    [uploadedDatasets, activeDatasetId]
  );

  const currentRows: Row[] = activeDataset?.rows || [];
  const currentFileName = activeDataset?.fileName || fileName || "Dataset";

  // 🔹 dataset picker pill state
  const [datasetPickerOpen, setDatasetPickerOpen] = useState(false);
  const datasetPickerRef = useRef<HTMLDivElement | null>(null);

  // close dataset dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!datasetPickerRef.current) return;
      if (!datasetPickerRef.current.contains(e.target as Node)) {
        setDatasetPickerOpen(false);
      }
    };

    if (datasetPickerOpen) {
      window.addEventListener("mousedown", handler);
    }
    return () => {
      window.removeEventListener("mousedown", handler);
    };
  }, [datasetPickerOpen]);

  // dataset basics (now driven by active dataset)
  const rowCount = currentRows.length;
  const columns = rowCount ? Object.keys(currentRows[0]) : [];

  const getNumericColumns = (rows: Row[]): string[] => {
    if (!rows.length) return [];
    const cols = Object.keys(rows[0]);
    return cols.filter((col) =>
      rows.some(
        (row) => typeof row[col] === "number" && !Number.isNaN(row[col])
      )
    );
  };

  const getCategoricalColumns = (rows: Row[], maxUnique = 20): string[] => {
    if (!rows.length) return [];
    const cols = Object.keys(rows[0]);
    const cats: string[] = [];

    for (const col of cols) {
      const values = rows
        .map((row) => row[col])
        .filter((v) => v !== null && v !== undefined);
      const unique = new Set(values);
      if (unique.size > 0 && unique.size <= maxUnique) {
        cats.push(col);
      }
    }
    return cats;
  };

  const getMissingCount = (rows: Row[]): number => {
    let missing = 0;
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        const v = row[key];
        if (v === null || v === undefined || v === "") missing++;
      }
    }
    return missing;
  };

  const numericCols = useMemo(
    () => getNumericColumns(currentRows),
    [currentRows]
  );
  const categoricalCols = useMemo(
    () => getCategoricalColumns(currentRows),
    [currentRows]
  );
  const missingCount = useMemo(
    () => getMissingCount(currentRows),
    [currentRows]
  );

  const firstNumeric = numericCols[0];
  const secondNumeric = numericCols[1];
  const firstCategorical = categoricalCols[0];

  const colValues = (col?: string) =>
    col ? currentRows.map((row) => row[col]) : [];

  // table pagination
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(rowCount / pageSize));
  const pageRows = useMemo(
    () =>
      currentRows.slice(
        (page - 1) * pageSize,
        (page - 1) * pageSize + pageSize
      ),
    [currentRows, page]
  );

  // chat state
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (!initialPrompt) return [];
    return [
      {
        id: 1,
        role: "user",
        content: initialPrompt,
      },
      {
        id: 2,
        role: "assistant",
        content:
          "I’ll help you explore this dataset. You can ask for summaries, trends, or specific visualizations.",
      },
    ];
  });
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // tools popup state (Plus button in chat)
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // chat open/close toggle
  const [chatOpen, setChatOpen] = useState(true);

  const [chartsFromPrompt, setChartsFromPrompt] = useState<BackendChart[]>([]);

  // --------------------------------------------------------------
  // Create a chart config based on user's prompt (no AI charts)
  // --------------------------------------------------------------
  function buildChartConfigFromPrompt(
    prompt: string,
    columns: string[]
  ) {
    const lower = prompt.toLowerCase();

    const wantsChart = [
      "chart",
      "graph",
      "plot",
      "bar",
      "line",
      "pie",
      "donut",
      "scatter",
      "histogram",
      "box plot",
      "boxplot",
      "treemap",
      "tree map",
      "heatmap",
      "heat map",
      "radar",
      "bubble",
      "funnel",
      "sunburst",
    ].some((token) => lower.includes(token));

    if (!wantsChart) return null;

    // infer chart type
    let type: any = "bar";

    if (lower.includes("line chart")) type = "line";
    else if (lower.includes("pie chart")) type = "pie";
    else if (lower.includes("donut")) type = "donut";
    else if (lower.includes("scatter")) type = "scatter";
    else if (lower.includes("histogram")) type = "histogram";
    else if (lower.includes("box plot") || lower.includes("boxplot")) type = "box";
    else if (lower.includes("treemap") || lower.includes("tree map")) type = "treemap";
    else if (lower.includes("area chart") || lower.includes("area")) type = "area";
    else if (lower.includes("heatmap") || lower.includes("heat map")) type = "heatmap";
    else if (lower.includes("radar")) type = "radar";
    else if (lower.includes("bubble")) type = "bubble";
    else if (lower.includes("funnel")) type = "funnel";
    else if (lower.includes("sunburst")) type = "sunburst";

    // detect column names from user prompt
    const normalizedPrompt = lower.replace(/_/g, " ");
    const mentionedCols = columns.filter((col) =>
      normalizedPrompt.includes(col.toLowerCase().replace(/_/g, " "))
    );

    let xField = mentionedCols[0] ?? columns[0] ?? "";
    let yField = mentionedCols[1] ?? columns[1] ?? columns[0] ?? "";

    if (!xField && !yField) return null;

    let agg: any = "sum";
    if (lower.includes("average") || lower.includes("avg")) agg = "avg";
    if (lower.includes("count")) agg = "count";

    const aggLabel =
      agg === "avg"
        ? "Average"
        : agg === "count"
          ? "Count"
          : "Sum";

    let prettyName: string;

    if (type === "histogram") {
      const field = yField || xField;
      prettyName = `Histogram of ${field}`;
    } else if (type === "box") {
      const numField = yField || xField;
      const catField = xField;
      prettyName = `Box plot of ${numField} by ${catField}`;
    } else if (type === "treemap") {
      prettyName = `${aggLabel} of ${yField} by ${xField} (Treemap)`;
    } else {
      prettyName = `${aggLabel} of ${yField} by ${xField}`;
    }

    return {
      id: `prompt-chart-${Date.now()}`,
      name: prettyName,
      type,
      xField,
      yField,
      agg,
    };
  }

  // 🔹 CSV → rows
  const parseCsvFile = (file: File): Promise<Row[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data as Row[]);
        },
        error: (err) => reject(err),
      });
    });
  };

  // 🔹 Excel → rows (ExcelJS, dynamic import)
  const parseExcelFile = async (file: File): Promise<Row[]> => {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();

    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) return [];

    const rows: Row[] = [];

    // header row
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell, colNumber) => {
      const v = cell.value;
      const header =
        typeof v === "string"
          ? v
          : v && typeof v === "object" && "text" in v
            ? String((v as any).text)
            : `Column${colNumber}`;
      headers.push(header);
    });

    // data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const obj: Row = {};
      headers.forEach((h, i) => {
        const cell = row.getCell(i + 1);
        let value = cell.value;

        if (value && typeof value === "object" && "text" in value) {
          value = (value as any).text;
        }

        obj[h] = value;
      });

      const hasAny = Object.values(obj).some(
        (v) => v !== null && v !== undefined && v !== ""
      );
      if (hasAny) rows.push(obj);
    });

    return rows;
  };

  // 🔹 generic dispatcher: any file → rows
  const parseFileToRows = async (file: File): Promise<Row[]> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";

    if (ext === "csv") {
      return parseCsvFile(file);
    }

    if (ext === "xlsx" || ext === "xls") {
      return parseExcelFile(file);
    }

    // fallback: attempt CSV
    try {
      return await parseCsvFile(file);
    } catch {
      return [];
    }
  };

  // load persisted messages
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedMsgs = sessionStorage.getItem(STORAGE_MESSAGES_KEY);
      if (storedMsgs) {
        const parsed: ChatMessage[] = JSON.parse(storedMsgs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (err) {
      console.error("Failed to load analysis state from sessionStorage", err);
    }
  }, []);

  // persist messages
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages));
    } catch (err) {
      console.error("Failed to store analysis messages", err);
    }
  }, [messages]);

  // keep chat scrolled to bottom
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [chatInput]);

  // close tools menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!toolsRef.current) return;
      if (!toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    if (toolsOpen) {
      window.addEventListener("mousedown", handler);
    }
    return () => {
      window.removeEventListener("mousedown", handler);
    };
  }, [toolsOpen]);

  // 🔹 Add-data from chat tools: parse & attach as new dataset
  const handleFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    const file = files[0];

    try {
      const rows = await parseFileToRows(file);

      const newDataset: UploadedDataset = {
        id: `${file.name}-${Date.now()}`,
        fileName: file.name,
        rows,
      };

      setUploadedDatasets((prev) => {
        const next = [...prev, newDataset];
        setActiveDatasetId(newDataset.id); // switch context to new dataset
        return next;
      });
    } catch (err) {
      console.error("Error parsing file in AnalysisPanel Add data:", err);
    }
  };

  const handleAddDataClick = () => {
    setToolsOpen(false);
    fileInputRef.current?.click();
  };

  const pushMessage = (msg: Omit<ChatMessage, "id">) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), ...msg },
    ]);
  };

  const sendPrompt = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed || sending) return;

    setSending(true);
    pushMessage({ role: "user", content: trimmed });
    setChatInput("");

    const chart = buildChartConfigFromPrompt(trimmed, columns);
    if (chart) {
      window.dispatchEvent(
        new CustomEvent("novaprowl-add-chart", { detail: chart })
      );
    }

    try {
      const res = await fetch(`${BACKEND}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          // all datasets for global context
          datasets: uploadedDatasets.map((ds) => ({
            id: ds.id,
            fileName: ds.fileName,
            rows: ds.rows,
            columns: ds.rows.length ? Object.keys(ds.rows[0]) : [],
          })),
          // which one is “active” in the UI right now
          activeDatasetId,
          // optional: keep single dataset fields for backward compat
          dataset: currentRows,
          columns,
          meta: { fileName: currentFileName, rowCount },
        }),
      });
    

    if (!res.ok) {
      const errText = await res.text();
      console.error("Backend /api/query error:", res.status, errText);
      pushMessage({
        role: "assistant",
        content:
          errText || `Something went wrong (status ${res.status}).`,
      });
      return;
    }

    const result = await res.json();

    if (result && typeof result === "object" && typeof result.summary === "string") {
      const answerText = result.summary as string;

      if (Array.isArray(result.charts)) {
        setChartsFromPrompt(
          result.charts.filter(
            (c: BackendChart) =>
              c && typeof c.title === "string" && typeof c.xField === "string"
          )
        );
      } else {
        setChartsFromPrompt([]);
      }

      pushMessage({
        role: "assistant",
        content: answerText,
      });
    } else {
      const answerText =
        result.reply ||
        result.answer ||
        result.content ||
        result.message ||
        (typeof result === "string"
          ? result
          : JSON.stringify(result, null, 2));

      pushMessage({
        role: "assistant",
        content: answerText,
      });
    }
  } catch (err: any) {
    console.error("Error talking to the analysis backend:", err);
    pushMessage({
      role: "assistant",
      content: "Error talking to the analysis backend.",
    });
  } finally {
    setSending(false);
  }
};

const handleSend = () => sendPrompt(chatInput);

const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};

const handleQuickAction = (label: string) => {
  setChatInput(label);
};

// splitter between data panel & chat panel
const [dataPanelWidth, setDataPanelWidth] = useState<number>(420);
const [isResizing, setIsResizing] = useState(false);
const twoColRef = useRef<HTMLDivElement | null>(null);

const startResizing = useCallback((e: React.MouseEvent) => {
  e.preventDefault();
  setIsResizing(true);
}, []);

useEffect(() => {
  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const container = twoColRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;

    const minLeft = 260;
    const maxLeft = Math.min(800, rect.width - 320);
    const clamped = Math.max(minLeft, Math.min(relativeX, maxLeft));

    setDataPanelWidth(clamped);
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  if (isResizing) {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResizing);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  } else {
    document.body.style.cursor = "default";
    document.body.style.userSelect = "auto";
  }

  return () => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", stopResizing);
  };
}, [isResizing]);

// ---------- layout ----------
return (
  <div className="h-screen bg-white flex overflow-hidden">
    {/* LEFT: global NovaProwl sidebar */}
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
          router.push("/"); // go back home
        }
      }}
      onChatsEmpty={() => router.push("/mainInterface")}
    />

    {/* RIGHT: header + resizable layout */}
    <main className="flex-1 flex flex-col bg-white min-w-0">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-gray-900">
              {currentFileName || "Data Summary Request"}
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-[11px] text-gray-600">
              {rowCount.toLocaleString()} rows · {columns.length} columns
            </span>
          </div>
          {initialPrompt && (
            <p className="text-xs text-gray-500 truncate max-w-md">
              Asked: <span className="italic">"{initialPrompt}"</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* 🔹 Dataset pill (same UX as main interface) */}
          <div className="relative" ref={datasetPickerRef}>
            <button
              type="button"
              onClick={() => setDatasetPickerOpen((o) => !o)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer max-w-[220px]"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span className="truncate">
                {currentFileName || "Select dataset"}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {datasetPickerOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-[0_18px_40px_rgba(15,23,42,0.12)] py-2 z-40 max-h-64 overflow-y-auto">
                {uploadedDatasets.map((ds) => (
                  <button
                    key={ds.id}
                    type="button"
                    onClick={() => {
                      setActiveDatasetId(ds.id);
                      setDatasetPickerOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-50 ${ds.id === activeDatasetId
                        ? "bg-slate-100 font-semibold"
                        : ""
                      }`}
                  >
                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">{ds.fileName}</span>
                  </button>
                ))}

                {uploadedDatasets.length === 0 && (
                  <div className="px-3 py-2 text-[11px] text-slate-500">
                    No datasets available.
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setChatOpen((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 font-medium"
          >
            {chatOpen ? "Hide Chat" : "Show Chat"}
          </button>
        </div>
      </div>

      {/* 2-column container: DATA PANEL | (optional) RESIZER | CHAT PANEL */}
      <div
        ref={twoColRef}
        className="flex flex-1 overflow-hidden relative min-w-0"
      >
        {/* LEFT PANE: data overview + KPIs + charts */}
        <div
          className="h-full flex flex-col overflow-hidden border-r border-gray-200 bg-white flex-shrink-0"
          style={
            chatOpen
              ? { width: dataPanelWidth, flexBasis: dataPanelWidth }
              : { width: "100%", flexBasis: "100%" }
          }
        >
          <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3 space-y-5">
            {/* Global Filters (active dataset) */}
            <GlobalFilters
              columns={columns}
              data={currentRows}
              onApplyFilters={(activeFilters, filteredRows) => {
                console.log("Active global filters:", activeFilters);
                console.log("Filtered rows:", filteredRows);
                // next: wire filteredRows into KPISection/DashboardSection if needed
              }}
            />

            <KPISection
              data={currentRows}
              columns={columns}
            />

            <DashboardSection
              data={currentRows}
              columns={columns}
              chartsFromPrompt={chartsFromPrompt}
            />
          </div>
        </div>

        {/* RESIZER + CHAT PANEL (only when chatOpen) */}
        {chatOpen && (
          <>
            {/* Resizer */}
            <div
              className={`w-[1px] bg-gray-200 relative hover:bg-blue-400 transition-colors cursor-col-resize z-10 flex items-center justify-center group ${isResizing ? "bg-blue-500 w-[2px]" : ""
                }`}
              onMouseDown={startResizing}
            >
              <div className="absolute inset-y-0 -left-2 -right-2 bg-transparent z-20 cursor-col-resize" />
              <div
                className={`absolute w-5 h-8 bg-white border border-gray-200 rounded-full shadow-sm flex items-center justify-center transition-all z-30 ${isResizing
                    ? "border-blue-400 scale-110"
                    : "group-hover:border-gray-300"
                  }`}
              >
                <div className="flex gap-[2px]">
                  <div className="w-[2px] h-3 bg-gray-300 rounded-full" />
                  <div className="w-[2px] h-3 bg-gray-300 rounded-full" />
                </div>
              </div>
            </div>

            {/* RIGHT PANE: Chat with floating prompt */}
            <div className="flex-1 min-w-[320px] flex flex-col h-full bg-white relative overflow-hidden">
              {/* messages */}
              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto px-6 py-4 space-y-3 pb-32"
              >
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"
                      }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${m.role === "user"
                          ? "bg-white border border-gray-200 text-gray-800 rounded-tr-none"
                          : "bg-white border border-emerald-100 text-gray-800"
                        }`}
                    >
                      <div className="flex items-center gap-2 mb-1 text-[11px] font-medium text-gray-500">
                        {m.role === "user" ? (
                          <>
                            <User className="w-3 h-3" />
                            <span>You</span>
                          </>
                        ) : (
                          <>
                            <Bot className="w-3 h-3" />
                            <span>Assistant</span>
                          </>
                        )}
                      </div>
                      {m.role === "assistant" ? (
                        <div className="text-sm leading-relaxed">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h2: ({ node, ...props }) => (
                                <h2
                                  className="mt-3 mb-2 text-base font-semibold text-gray-900"
                                  {...props}
                                />
                              ),
                              h3: ({ node, ...props }) => (
                                <h3
                                  className="mt-2 mb-1 text-sm font-semibold text-gray-900"
                                  {...props}
                                />
                              ),
                              p: ({ node, ...props }) => (
                                <p
                                  className="mt-1 mb-2 text-sm text-gray-800"
                                  {...props}
                                />
                              ),
                              ul: ({ node, ...props }) => (
                                <ul
                                  className="mt-1 mb-2 list-disc pl-5 space-y-1 text-sm text-gray-800"
                                  {...props}
                                />
                              ),
                              ol: ({ node, ...props }) => (
                                <ol
                                  className="mt-1 mb-2 list-decimal pl-5 space-y-1 text-sm text-gray-800"
                                  {...props}
                                />
                              ),
                              li: ({ node, ...props }) => <li {...props} />,
                              table: ({ node, ...props }) => (
                                <div className="mt-3 mb-3 overflow-x-auto">
                                  <table
                                    className="min-w-full text-xs border border-gray-200 border-collapse"
                                    {...props}
                                  />
                                </div>
                              ),
                              thead: ({ node, ...props }) => (
                                <thead className="bg-gray-50" {...props} />
                              ),
                              th: ({ node, ...props }) => (
                                <th
                                  className="border border-gray-200 px-3 py-2 font-semibold text-left text-gray-900"
                                  {...props}
                                />
                              ),
                              td: ({ node, ...props }) => (
                                <td
                                  className="border border-gray-200 px-3 py-2 text-gray-800"
                                  {...props}
                                />
                              ),
                            }}
                          >
                            {m.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {m.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {messages.length > 0 && (
                  <div className="flex items-center gap-2 mt-4 text-xs text-gray-500 pl-1">
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span>
                      AI responses are based on your uploaded dataset and
                      current context.
                    </span>
                  </div>
                )}
              </div>

              {/* floating prompt */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl">
                <div className="bg-white border border-gray-200 rounded-2xl shadow-lg px-3">
                  <div className="flex py-4 items-center gap-2">
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      className="flex-1 resize-none bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-400 max-h-[200px]"
                      placeholder="Ask a follow-up question…"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />

                    {/* PLUS BUTTON WITH POPUP MENU */}
                    <div className="relative" ref={toolsRef}>
                      {/* hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFilesSelected}
                      />

                      <button
                        className="h-8 flex w-8 rounded-full bg-black text-white flex items-center justify-center hover:opacity-70"
                        type="button"
                        onClick={() => setToolsOpen((o) => !o)}
                      >
                        <PlusIcon size={16} />
                      </button>

                      {toolsOpen && (
                        <div className="absolute bottom-10 right-0 w-64 rounded-2xl bg-white shadow-xl border border-gray-200 py-2 text-sm z-50">
                          <button
                            onClick={handleAddDataClick}
                            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 hover:rounded-full text-gray-800"
                          >
                            <span className="text-lg">📎</span>
                            <span>Add data</span>
                          </button>
                          <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 hover:rounded-full text-gray-800">
                            <span className="text-lg">🖼️</span>
                            <span>Add image</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* send button */}
                    <button
                      className="h-8 flex w-8 rounded-full bg-black text-white flex items-center justify-center hover:opacity-70"
                      onClick={handleSend}
                      disabled={sending || !chatInput.trim()}
                    >
                      <ArrowUp size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  </div>
);
}