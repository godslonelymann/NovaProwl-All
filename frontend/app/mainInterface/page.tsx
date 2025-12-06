"use client";

import UploadData from "../../components/UploadData";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { useSessionStore } from "../../components/SessionStore";
import Papa from "papaparse";
import ExcelJS from "exceljs";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND || "http://localhost:8000").replace(
  /\/+$/,
  ""
);

import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Compass,
  BookOpen,
  FunctionSquare,
  FileText,
  PlugZap,
  ChevronUp,
  ChevronDown,
  UploadCloud,
  BarChart3,
  Brain,
  Link2,
  Paperclip,
  SlidersHorizontal,
  Settings,
  Sparkles,
  ArrowUp,
} from "lucide-react";

type Row = Record<string, unknown>;

type DatasetKind = "table" | "text" | "code" | "other";

type UploadedDataset = {
  id: string;
  fileName: string;
  rows: Row[];
  columns: string[];
  extension?: string;
  kind?: DatasetKind;
  textContent?: string;
};

const spaces = [
  { icon: MessageCircle, label: "Chat" },
  { icon: Compass, label: "Explore" },
  { icon: BookOpen, label: "Playbooks" },
];

const tools = [
  { icon: FunctionSquare, label: "Formula Generator" },
  { icon: FileText, label: "PDF to Excel Converter" },
  { icon: PlugZap, label: "Install Add-ons" },
];

const quickActions = [
  "Clean data",
  "Generate charts",
  "Exploratory analysis",
  "Data science",
  "See all",
];

const featureCards = [
  {
    icon: UploadCloud,
    color: "bg-slate-600",
    title: "Upload data",
    text: "Upload spreadsheets or connect to a data source",
  },
  {
    icon: BarChart3,
    color: "bg-amber-400",
    title: "Quantitative analysis",
    text: "Generate charts, tables, insights, data science models & more",
  },
  {
    icon: Brain,
    color: "bg-slate-500",
    title: "Qualitative analysis",
    text: "Add an AI-generated columns to your dataset with Enrichments",
  },
  {
    icon: Link2,
    color: "bg-red-400",
    title: "Connect to external data",
    text: "Securely store your API keys and connect to any data source",
  },
];

const collectColumns = (rows: Row[]): string[] => {
  if (!rows.length) return [];
  const keys = new Set<string>();
  rows.forEach((r) => Object.keys(r || {}).forEach((k) => keys.add(k)));
  return Array.from(keys);
};

const parseCsvOrTsv = (file: File, delimiter?: string): Promise<Row[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimiter,
      complete: (results) => resolve((results.data as Row[]) || []),
      error: (err) => reject(err),
    });
  });
};

const parseExcel = async (file: File): Promise<Row[]> => {
  const buf = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buf);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const headerRow = sheet.getRow(1);
  const headers = (headerRow.values || []).slice(1).map((v, idx) => (v != null ? String(v) : `Column ${idx + 1}`));

  const rows: Row[] = [];
  sheet.eachRow((row, idx) => {
    if (idx === 1) return;
    const record: Row = {};
    headers.forEach((h, colIdx) => {
      const values = row.values || [];
      record[h] = (values as any)[colIdx + 1] ?? null;
    });
    rows.push(record);
  });
  return rows;
};

const parseJson = async (file: File): Promise<{ rows: Row[]; text?: string }> => {
  const text = await file.text();
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === "object" && v !== null)) {
      return { rows: parsed as Row[] };
    }
    return { rows: [], text };
  } catch {
    return { rows: [], text };
  }
};

const parseAsText = async (file: File): Promise<string> => {
  return file.text();
};

export default function MainInterface() {
  const [activeSpace, setActiveSpace] = useState<string>("Chat");
  const [activeTool, setActiveTool] = useState<string | undefined>(undefined);
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [recentChats, setRecentChats] = useState<string[]>([]);
  const [showSources, setShowSources] = useState(false);

  const { sessions, createSession, setActiveSessionId } = useSessionStore();

  // 🔹 upload-related state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 🔹 ALL datasets uploaded in this chat
  const [uploadedDatasets, setUploadedDatasets] = useState<UploadedDataset[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);

  // derived: currently selected dataset for pill in main interface
  const activeDataset =
    uploadedDatasets.find((d) => d.id === activeDatasetId) ||
    uploadedDatasets[0] ||
    null;
  const uploadedFileName = activeDataset?.fileName ?? null;

  // 🔹 analysis view trigger (kept from your original, though /analysis is main flow)
  const [showAnalysis, setShowAnalysis] = useState(false);

  // 🔹 dataset pill dropdown state (main interface)
  const [datasetPickerOpen, setDatasetPickerOpen] = useState(false);
  const datasetPickerRef = useRef<HTMLDivElement | null>(null);

  // keep recentChats synced with persistent sessions
  useEffect(() => {
    setRecentChats(sessions.map((s) => s.title));
  }, [sessions]);

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

  const uploadWithProgress = (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${BACKEND}/api/upload`);

      const formData = new FormData();
      formData.append("file", file);

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const percent = Math.round((evt.loaded / evt.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadProgress(100);
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(formData);
    });
  };

  // 🔹 called by UploadData when user picks files
  const handleFilesSelected = async (files: FileList) => {
    if (!files.length) return;

    setShowSources(false);
    setUploadProgress(0);
    setUploading(true);
    setShowAnalysis(false);

    try {
      const fileArray = Array.from(files);
      const newDatasets: UploadedDataset[] = [];

      for (const file of fileArray) {
        // upload for persistence/progress; parse client-side for UI/state
        try {
          await uploadWithProgress(file);
        } catch (e) {
          console.warn("Upload progress call failed (continuing with local parse)", e);
        }

        const ext = (file.name.split(".").pop() || "").toLowerCase();
        let rows: Row[] = [];
        let textContent: string | undefined;

        if (ext === "csv" || ext === "tsv") {
          rows = await parseCsvOrTsv(file, ext === "tsv" ? "\t" : undefined);
        } else if (ext === "xlsx" || ext === "xls") {
          rows = await parseExcel(file);
        } else if (ext === "json") {
          const parsed = await parseJson(file);
          rows = parsed.rows;
          textContent = parsed.text;
        } else {
          textContent = await parseAsText(file);
        }

        const columns = collectColumns(rows);

        newDatasets.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          fileName: file.name,
          rows,
          columns,
          extension: ext,
          kind: rows.length ? "table" : textContent ? "text" : "other",
          textContent,
        });
      }

      setUploadedDatasets((prev) => {
        const merged = [...prev, ...newDatasets];
        // If this is the first upload, set the first dataset as active
        if (!activeDatasetId && merged.length > 0) {
          setActiveDatasetId(merged[0].id);
        }
        return merged;
      });
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSend = () => {
    const value = prompt.trim();
    if (!value) return;
    if (!uploadedDatasets.length) {
      alert("Please upload at least one dataset first.");
      return;
    }

    const title =
      value.length > 40 ? value.slice(0, 37).trimEnd() + "..." : value;

    setRecentChats((prev) => [title, ...prev]);

    const session = createSession({
      firstPrompt: value,
      fileName: activeDataset?.fileName || undefined,
    });
    setActiveSessionId(session.id);

    const effectiveActiveDatasetId =
      activeDatasetId || uploadedDatasets[0]?.id || null;

    // 🔹 Save ALL datasets for this session
    localStorage.setItem(
      `novaprowl_session_data_v1_${session.id}`,
      JSON.stringify({
        datasets: uploadedDatasets,
        activeDatasetId: effectiveActiveDatasetId,
        initialPrompt: value,
      })
    );

    // (optional legacy keys, for fallback single-dataset flows)
    const first = uploadedDatasets[0];
    if (first) {
      sessionStorage.setItem("analysis_dataset", JSON.stringify(first.rows));
      sessionStorage.setItem("analysis_file", first.fileName);
      sessionStorage.setItem("analysis_prompt", value);
    }

    router.push("/analysis");
  };

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-slate-800 flex">
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
            setPrompt("");
            setUploadedDatasets([]);
            setActiveDatasetId(null);
            setShowAnalysis(false);
            setActiveSessionId(null);
          }
        }}
        onSelectChat={(chatTitle) => {
          const session = sessions.find((s) => s.title === chatTitle);
          if (!session) return;

          setActiveSessionId(session.id);
          router.push("/analysis");
        }}
      />

      <UploadData
        open={showSources}
        onClose={() => setShowSources(false)}
        onFilesSelected={handleFilesSelected}
      />

      <main className="flex-1  bg-white flex flex-col">
        {/* Top bar for mobile toggle */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-[#f4f2ee]">
          <button
            onClick={() => setShowSources((s) => !s)}
            className="h-9 w-9 rounded-full bg-white shadow flex items-center justify-center border border-slate-200"
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-600" />
            )}
          </button>
          <span className="text-sm font-medium text-slate-700">
            NovaProwl
          </span>
          <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">
            A
          </div>
        </div>

        {/* Centered main body */}
        <div className="flex-1 flex justify-center items-start md:items-center px-4 md:px-10 lg:px-24 ">
          <div className="w-full max-w-3xl pt-12 pb-16 md:pt-0 md:pb-0 ">
            {/* Greeting */}
            <div className="mb-8">
              <h1 className="text-[32px] md:text-[36px] font-semibold text-slate-900 leading-tight">
                Good Evening, Anurag
              </h1>
              <p className="mt-1 text-[22px] text-slate-400 leading-tight">
                Ready to start analyzing?
              </p>
            </div>

            {/* Floating prompt card */}
            <div className="w-full mb-10 rounded-2xl bg-white border border-slate-300 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <div className="px-8 pt-6 pb-5 flex flex-col gap-5">
                {/* Input */}
                <div className="w-full rounded-2xl flex items-center">
                  <input
                    className="flex-1 pb-10 bg-transparent outline-none bg-white text-[15px] text-slate-800 placeholder:text-slate-400"
                    placeholder="Ask NovaProwl to..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                </div>

                {/* Buttons row */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    {/* Add data */}
                    <button
                      onClick={() => setShowSources(true)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      Add data
                    </button>

                    {/* Dataset pill container (shows active file, dropdown for all) */}
                    {uploadedDatasets.length > 0 && (
                      <div className="relative" ref={datasetPickerRef}>
                        <button
                          type="button"
                          onClick={() => setDatasetPickerOpen((o) => !o)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 border border-slate-200 px-3.5 py-3 text-xs text-slate-700 max-w-[220px]"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span className="truncate">
                            {uploadedFileName || "Select dataset"}
                          </span>
                          <ChevronDown className="w-3 h-3 text-slate-500" />
                        </button>

                        {datasetPickerOpen && (
                          <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-[0_18px_40px_rgba(15,23,42,0.12)] py-2 z-40 max-h-64 overflow-y-auto">
                            {uploadedDatasets.map((ds) => (
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
                                <span className="truncate">
                                  {ds.fileName}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <button className="h-9 w-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 cursor-pointer">
                      <Settings className="w-4 h-4" />
                    </button>
                    <button className="h-9 w-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 cursor-pointer">
                      <Sparkles className="w-4 h-4" />
                    </button>
                    <button
                      className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 cursor-pointer"
                      onClick={handleSend}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {uploading && (
                  <div className="mt-1 w-full max-w-xs">
                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Uploading… {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* (AnalysisPanel inline rendering is not used now; analysis happens on /analysis) */}
          </div>
        </div>
      </main>
    </div>
  );
}
