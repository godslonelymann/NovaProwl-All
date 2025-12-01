"use client";

import UploadData from "./UploadData";
import AnalysisPanel from "./AnalysisPanel"; // 🔹 still here as you had it
import Papa from "papaparse"; // 🔹 CSV parsing for KPIs
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar"; // 🔹 NEW

// 🔹 NEW: session store hook (adjust path if your SessionStore lives elsewhere)
import { useSessionStore } from "./SessionStore";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND || "http://localhost:8000").replace(
  /\/+$/,
  ""
);

import React, { useState, useEffect } from "react";
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

type Row = Record<string, any>;

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

export default function MainInterface() {
  const [activeSpace, setActiveSpace] = useState<string>("Chat");
  const [activeTool, setActiveTool] = useState<string | undefined>(undefined);
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [recentChats, setRecentChats] = useState<string[]>([]);
  const [showSources, setShowSources] = useState(false);
  const [showSourcesModal, setShowSourcesModal] = useState(false);

  // 🔹 NEW: hook into session store (localStorage-backed)
  const { sessions, createSession, setActiveSessionId } = useSessionStore();

  // 🔹 upload-related state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // 🔹 analysis / charts state
  const [analysisData, setAnalysisData] = useState<Row[] | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // 🔹 NEW: keep local recentChats in sync with persistent sessions
  useEffect(() => {
    // titles only, first time = [] so Recent Chats is empty
    setRecentChats(sessions.map((s) => s.title));
  }, [sessions]);

  const handleSend = () => {
    const value = prompt.trim();
    if (!value) return;

    // 🔹 create a *title* for Recent Chats (truncated)
    const title =
      value.length > 40 ? value.slice(0, 37).trimEnd() + "..." : value;

    // store as a new chat in Recent Chats (local UI state)
    setRecentChats((prev) => [title, ...prev]);

    // 🔹 NEW: create a persistent session in localStorage
    const session = createSession({
      firstPrompt: value,
      fileName: uploadedFileName || undefined,
    });
    setActiveSessionId(session.id);

    if (analysisData && uploadedFileName) {
      localStorage.setItem(
        `novaprowl_session_data_v1_${session.id}`,
        JSON.stringify({
          fileName: uploadedFileName,
          data: analysisData,
          initialPrompt: value,
        })
      );

      // optional: old sessionStorage keys
      sessionStorage.setItem("analysis_dataset", JSON.stringify(analysisData));
      sessionStorage.setItem("analysis_file", uploadedFileName);
      sessionStorage.setItem("analysis_prompt", value);

      router.push("/analysis");
    }
  };

  // 🔹 helper: upload with progress bar
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

  // 🔹 helper: parse CSV on the client for KPIs / charts
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

  // 🔹 called by UploadData when user picks files
  const handleFilesSelected = async (files: FileList) => {
    if (!files.length) return;
    const file = files[0];

    setShowSources(false);
    setUploadedFileName(null);
    setUploadProgress(0);
    setUploading(true);
    setShowAnalysis(false); // reset view on new upload

    try {
      // 1) upload to backend
      await uploadWithProgress(file);
      setUploadedFileName(file.name); // show pill next to Add data

      // 2) parse CSV locally for analysis UI (only CSV for now)
      if (file.name.toLowerCase().endsWith(".csv")) {
        const rows = await parseCsvFile(file);
        setAnalysisData(rows);
      } else {
        setAnalysisData(null);
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-slate-800 flex">
      {/* Sidebar (now as a separate component) */}

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
            setAnalysisData(null);
            setUploadedFileName(null);
            setShowAnalysis(false);
            setActiveSessionId(null); // clear active session
          }
        }}
        onSelectChat={(chatTitle) => {
          const session = sessions.find((s) => s.title === chatTitle);
          if (!session) return;

          setActiveSessionId(session.id);
          router.push("/analysis");
        }}
      />

      {/* 🔹 UploadData modal (NotebookLM-style) */}
      <UploadData
        open={showSources}
        onClose={() => setShowSources(false)}
        onFilesSelected={handleFilesSelected}
      />

      {/* Main content */}
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
                <div className="w-full rounded-2xl  flex items-center">
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
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setShowSources(true)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      Add data
                    </button>

                    {/* 🔹 Uploaded file pill beside Add data */}
                    {uploadedFileName && !uploading && (
                      <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 border border-slate-200 px-3.5 py-3 text-xs text-slate-700 max-w-[200px]">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span className="truncate">{uploadedFileName}</span>
                      </div>
                    )}

                    {/* (your Add tools button is commented out, left as-is) */}
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

                {/* 🔹 Upload progress bar under buttons */}
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

            {/* 🔹 AnalysisPanel appears AFTER upload + send (kept as you had it) */}
            {showAnalysis && analysisData && uploadedFileName && (
              <div className="mt-4">
                <AnalysisPanel fileName={uploadedFileName} data={analysisData} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}