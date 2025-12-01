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
  X, // 🔹 ADDED
  MessageCircle, // 🔹 ADDED
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import GlobalFilters from "./GlobalFilters";
import KPISection from "./KPISection";
import DashboardSection from "./Dashboard/DashboardSection";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

type Row = Record<string, any>;

type AnalysisPanelProps = {
  fileName: string;
  data: Row[];
  initialPrompt?: string;
};

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: number;
  role: ChatRole;
  content: string;
};

const QUICK_ACTIONS = [
  "Provide data summary statistics",
  "Highlight main trends in this dataset",
  "Detect anomalies or outliers",
  "Suggest useful charts for this data",
];

// 🔹 storage keys for this analysis view
const STORAGE_MESSAGES_KEY = "analysis_messages";
const STORAGE_RECENT_KEY = "analysis_recent_chats";

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
}: AnalysisPanelProps) {
  const router = useRouter();

  // Nova sidebar state (outer app sidebar)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [recentChats, setRecentChats] = useState<string[]>(
    initialPrompt ? [initialPrompt] : []
  );

  // which space is active
  const [activeSpace, setActiveSpace] = useState<string>("Chat");

  // dataset basics
  const rowCount = data.length;
  const columns = rowCount ? Object.keys(data[0]) : [];

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

  const numericCols = useMemo(() => getNumericColumns(data), [data]);
  const categoricalCols = useMemo(
    () => getCategoricalColumns(data),
    [data]
  );
  const missingCount = useMemo(() => getMissingCount(data), [data]);

  const firstNumeric = numericCols[0];
  const secondNumeric = numericCols[1];
  const firstCategorical = categoricalCols[0];

  const colValues = (col?: string) =>
    col ? data.map((row) => row[col]) : [];

  // table pagination
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(rowCount / pageSize));
  const pageRows = useMemo(
    () =>
      data.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize),
    [data, page]
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

  // 🔹 chat open/close toggle for the whole right panel
  const [chatOpen, setChatOpen] = useState(true);

  // load persisted messages & recent chats
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

      const storedRecent = sessionStorage.getItem(STORAGE_RECENT_KEY);
      if (storedRecent) {
        const parsedRecent: string[] = JSON.parse(storedRecent);
        if (Array.isArray(parsedRecent) && parsedRecent.length > 0) {
          setRecentChats(parsedRecent);
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

  // persist recent chats
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(STORAGE_RECENT_KEY, JSON.stringify(recentChats));
    } catch (err) {
      console.error("Failed to store analysis recent chats", err);
    }
  }, [recentChats]);

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

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    console.log(
      "Files from chat tools menu:",
      Array.from(files).map((f) => f.name)
    );
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
    // user message
    pushMessage({ role: "user", content: trimmed });
    setChatInput("");
    setRecentChats((prev) => [trimmed, ...prev.slice(0, 4)]);

    try {
      const res = await fetch(`${BACKEND}/api/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: trimmed,
          dataset: data,      // 👈 full rows
          columns,            // 👈 column names
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

      // Expecting something like: { reply: "...", charts: [...], trace: {...} }
      const answerText =
        result.reply ||
        result.answer ||
        result.content ||
        result.message ||
        (typeof result === "string" ? result : JSON.stringify(result, null, 2));

      if (Array.isArray(result.charts)) {
        console.log("Agent charts suggestion:", result.charts);
      }

      pushMessage({
        role: "assistant",
        content: answerText,
      });
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
    // if you want auto-send: sendPrompt(label);
  };

  // splitter between data panel & chat panel
  const [dataPanelWidth, setDataPanelWidth] = useState<number>(420); // px
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

      const minLeft = 260; // min px for data panel
      const maxLeft = Math.min(800, rect.width - 320); // leave ≥320px for chat
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
      />

      {/* RIGHT: header + resizable layout */}
      <main className="flex-1 flex flex-col bg-white min-w-0">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-gray-900">
                {fileName || "Data Summary Request"}
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

          <div className="flex items-center gap-2">

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
              {/* 🔹 Global Filters */}
              <GlobalFilters
                columns={columns}
                data={data}
                onApplyFilters={(activeFilters, filteredRows) => {
                  // For now just inspect this in DevTools.
                  console.log("Active global filters:", activeFilters);
                  console.log("Filtered rows:", filteredRows);
                  // Next step: we’ll replace `data`-derived metrics with `filteredRows`.
                }}
              />

              <KPISection
                data={data /* or filteredRows later */}
                columns={columns}
              />

              {/* 🔹 Dashboard charts driven by dataset */}
              <DashboardSection data={data} columns={columns} />
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
                {/* 🔹 Close chat button INSIDE chat panel */}
                <button
                  onClick={() => setChatOpen(false)}
                  className="absolute top-3 right-4 z-30 flex items-center gap-1 text-[11px] px-3 py-1 rounded-full bg-gray-900 text-white hover:bg-gray-800 shadow-sm"
                >
                  <X className="w-3 h-3" />
                  Close chat
                </button>

                {/* quick actions */}
                <div className="px-6 pt-4 pb-2 border-b border-gray-100">
                  <div className="flex flex-wrap gap-2">
                    {QUICK_ACTIONS.map((label) => (
                      <button
                        key={label}
                        onClick={() => handleQuickAction(label)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-[11px] text-gray-600 hover:bg-gray-50 shadow-sm"
                      >
                        <Sparkles size={12} className="text-gray-400" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

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
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
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

          {/* 🔹 When chat is closed, show an "Open chat" floating pill in bottom-right */}
          {!chatOpen && (
            <button
              onClick={() => setChatOpen(true)}
              className="absolute bottom-4 right-4 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white text-xs shadow-lg hover:bg-gray-900"
            >
              <MessageCircle className="w-4 h-4" />
              Open chat
            </button>
          )}
        </div>
      </main>
    </div>
  );
}