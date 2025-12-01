"use client";

import React, { useState } from "react";
import { Upload, Database, User, Plus, Mic, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
});

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND || "http://localhost:8000").replace(
  /\/+$/,
  ""
);

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  chart?: any;
};

type DatasetItem = {
  id: number;
  name: string;
  size: string;
};

export default function Dashboard() {
  const [isHovered, setIsHovered] = useState(false);
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  // Generate a unique color for each column
  const COLORS = [
    "#00a4b4",
    "#ff6b6b",
    "#feca57",
    "#1dd1a1",
    "#5f27cd",
    "#341f97",
    "#ee5253",
    "#48dbfb",
    "#10ac84",
    "#576574"
  ];

  function getColorForColumn(column: string) {
    // simple deterministic hash → stable color for each column
    let hash = 0;
    for (let i = 0; i < column.length; i++) {
      hash = (hash << 5) - hash + column.charCodeAt(i);
      hash |= 0; // force 32bit
    }
    return COLORS[Math.abs(hash) % COLORS.length];
  }

  // Upload file to backend
  const uploadToBackend = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);

      const res = await fetch(`${BACKEND}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error || `Upload failed (${res.status})`;
        console.error(msg, err);
        alert(msg);
        return null;
      }

      const data = await res.json();
      return data;
    } catch (e: any) {
      console.error("Upload error:", e);
      alert(`Upload error: ${e?.message || "Unknown error"}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Handle file selection from sidebar
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Update sidebar list
    const newItems: DatasetItem[] = files.map((file, index) => ({
      id: Date.now() + index,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
    }));

    setDatasets((prev) => [...prev, ...newItems]);

    // For each file: upload → auto-analysis
    for (const file of files as File[]) {
      const up = await uploadToBackend(file);
      if (!up) continue;

      try {
        const analysisRes = await fetch(`${BACKEND}/api/analysis`, {
          method: "POST",
        });

        if (!analysisRes.ok) {
          const err = await analysisRes.json().catch(() => ({}));
          const msg = err?.error || `Analysis failed (${analysisRes.status})`;
          console.error(msg, err);
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              role: "assistant",
              content: msg,
            },
          ]);
          continue;
        }

        const analysis = await analysisRes.json();

        // Add summary as assistant message
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            role: "assistant",
            content:
              `### Dataset Summary\n\n` +
              "```json\n" +
              JSON.stringify(analysis.summary, null, 2) +
              "\n```",
          },
        ]);

        // Add charts as separate messages
        if (analysis.charts) {
          Object.values(analysis.charts).forEach((chart: any) => {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now() + Math.random(),
                role: "assistant",
                content: "",
                chart,
              },
            ]);
          });
        }
      } catch (err: any) {
        console.error("Analysis error:", err);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            role: "assistant",
            content: `Analysis error: ${err?.message || "Unknown error"}`,
          },
        ]);
      }
    }

    // allow re-selecting the same file
    e.target.value = "";
  };

  // Send prompt to /api/query (agentic backend)
  const sendPrompt = async () => {
    const userText = prompt.trim();
    if (!userText || loading) return;

    const userId = Date.now();

    // show user message in chat
    setMessages((prev) => [
      ...prev,
      {
        id: userId,
        role: "user",
        content: userText,
      },
    ]);

    setLoading(true);

    try {
      const res = await fetch(`${BACKEND}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userText }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error || `Query failed (${res.status})`;
        console.error(msg, err);
        setMessages((prev) => [
          ...prev,
          {
            id: userId + 1,
            role: "assistant",
            content: msg,
          },
        ]);
        setPrompt("");
        setLoading(false);
        return;
      }

      const data = await res.json();

      // assistant reply text
      setMessages((prev) => [
        ...prev,
        {
          id: userId + 1,
          role: "assistant",
          content: data.reply || "(empty reply)",
        },
      ]);

      // any charts created by tools
      if (Array.isArray(data.charts)) {
        data.charts.forEach((chart: any) => {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              role: "assistant",
              content: "",
              chart,
            },
          ]);
        });
      }
    } catch (e: any) {
      console.error("Query error:", e);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          role: "assistant",
          content: `Query error: ${e?.message || "Unknown error"}`,
        },
      ]);
    } finally {
      setPrompt("");
      setLoading(false);
    }
  };

  const removeDataset = (id: number) => {
    setDatasets((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Sidebar */}
      <div
        className="relative z-20"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={`h-full bg-neutral-950 border-r border-neutral-800 transition-all duration-500 ease-out flex flex-col ${isHovered ? "w-72" : "w-16"
            }`}
          style={{
            boxShadow: isHovered ? "4px 0 24px rgba(0, 0, 0, 0.5)" : "none",
          }}
        >
          {/* Upload Button */}
          <div className="p-3 border-b border-neutral-800">
            <label
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 ${isHovered
                  ? "bg-neutral-900 hover:bg-neutral-800"
                  : "justify-center hover:bg-neutral-900"
                }`}
            >
              <Upload
                size={20}
                className="text-neutral-400 flex-shrink-0"
              />
              <span
                className={`text-sm font-medium text-neutral-300 whitespace-nowrap transition-all duration-500 ${isHovered
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-4 absolute"
                  }`}
              >
                {uploading ? "Uploading..." : "Upload Dataset"}
              </span>
              <input
                type="file"
                multiple
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Datasets */}
          <div
            className="p-3 overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 180px)" }}
          >
            <div
              className={`transition-all duration-500 ${isHovered ? "opacity-100" : "opacity-0"
                }`}
            >
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 px-3">
                Datasets
              </h3>
            </div>

            <div className="space-y-2">
              {datasets.map((dataset) => (
                <div
                  key={dataset.id}
                  className={`group relative flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${isHovered
                      ? "hover:bg-neutral-900"
                      : "justify-center hover:bg-neutral-900"
                    }`}
                >
                  <Database
                    size={18}
                    className="text-emerald-400 flex-shrink-0"
                  />
                  <div
                    className={`flex-1 min-w-0 transition-all duration-500 ${isHovered
                        ? "opacity-100 translate-x-0"
                        : "opacity-0 -translate-x-4 absolute"
                      }`}
                  >
                    <p className="text-sm font-medium text-neutral-200 truncate">
                      {dataset.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {dataset.size}
                    </p>
                  </div>
                  {isHovered && (
                    <button
                      onClick={() => removeDataset(dataset.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-neutral-800 rounded"
                    >
                      <X
                        size={14}
                        className="text-neutral-500 hover:text-neutral-300"
                      />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* User Settings at Bottom */}
          <div className="border-t border-neutral-800 p-3">
            <button
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${isHovered
                  ? "hover:bg-neutral-900"
                  : "justify-center hover:bg-neutral-900"
                }`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-white" />
              </div>
              <div
                className={`flex-1 text-left transition-all duration-500 ${isHovered
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-4 absolute"
                  }`}
              >
                <p className="text-sm font-medium text-neutral-200">
                  John Doe
                </p>
                <p className="text-xs text-neutral-500">
                  john@example.com
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Chat / Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
                  Data Assistant
                </h1>
                <p className="text-neutral-500">
                  Upload a dataset and ask questions in natural language to
                  explore, analyze, and visualize your data.
                </p>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`w-full bg-neutral-950 border border-neutral-800 p-6 rounded-2xl`}
              >
                {m.content && (
                  <div className="text-sm leading-relaxed space-y-2">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                )}

                {m.chart && (
                  <div className="mt-4">
                    <Plot
                      data={[
                        m.chart.type === "histogram"
                          ? {
                            type: "histogram",
                            x: m.chart.values,
                            marker: { color: getColorForColumn(m.chart.column || "") },
                          }
                          : m.chart.type === "bar"
                            ? {
                              type: "bar",
                              x: m.chart.x,
                              y: m.chart.y,
                              marker: { color: getColorForColumn(m.chart.column || "") },
                            }
                            : m.chart.type === "scatter"
                              ? {
                                type: "scatter",
                                mode: "markers",
                                x: m.chart.x,
                                y: m.chart.y,
                                marker: { color: getColorForColumn(m.chart.column || "") },
                              }
                              : {
                                type: "line",
                                x: m.chart.x,
                                y: m.chart.y,
                                line: { color: getColorForColumn(m.chart.column || "") },
                              }
                      ]}
                      layout={{
                        paper_bgcolor: "black",
                        plot_bgcolor: "black",
                        font: { color: "white" },
                        title:
                          m.chart.type === "histogram"
                            ? `Histogram of ${m.chart.column || ""}`
                            : m.chart.type === "bar"
                              ? `Bar Chart of ${m.chart.column || ""}`
                              : m.chart.type === "scatter"
                                ? "Scatter Plot"
                                : `Line Chart of ${m.chart.column || ""}`,
                        margin: { t: 40, l: 50, r: 20, b: 40 },
                      }}
                      config={{ scrollZoom: true, responsive: true }}
                      style={{ width: "100%", height: "100%" }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Floating Prompt Area */}
        <div className="sticky bottom-0 w-full bg-gradient-to-t from-black via-black to-transparent pt-4 pb-6 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative flex items-center gap-4 bg-neutral-950 border border-neutral-800 rounded-full px-6 py-4 shadow-2xl hover:border-neutral-700 transition-colors">
              <button
                className="flex-shrink-0 text-neutral-500 hover:text-neutral-300 transition-colors"
                type="button"
              >
                <Plus size={22} strokeWidth={2} />
              </button>

              <input
                type="text"
                placeholder={
                  loading
                    ? "Thinking over your data..."
                    : "Ask anything about your dataset..."
                }
                className="flex-1 bg-transparent text-white text-base placeholder-neutral-600 outline-none border-none"
                value={prompt}
                disabled={loading}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    sendPrompt();
                  }
                }}
              />

              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  className="text-neutral-500 hover:text-neutral-300 transition-colors"
                  type="button"
                >
                  <Mic size={22} strokeWidth={2} />
                </button>

                <button
                  className="text-neutral-500 hover:text-neutral-300 transition-colors"
                  type="button"
                  onClick={sendPrompt}
                >
                  {/* simple "send" bars icon */}
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <rect
                      x="4"
                      y="8"
                      width="2"
                      height="8"
                      rx="1"
                      fill="currentColor"
                    />
                    <rect
                      x="8"
                      y="5"
                      width="2"
                      height="14"
                      rx="1"
                      fill="currentColor"
                    />
                    <rect
                      x="12"
                      y="7"
                      width="2"
                      height="10"
                      rx="1"
                      fill="currentColor"
                    />
                    <rect
                      x="16"
                      y="4"
                      width="2"
                      height="16"
                      rx="1"
                      fill="currentColor"
                    />
                    <rect
                      x="20"
                      y="9"
                      width="2"
                      height="6"
                      rx="1"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
