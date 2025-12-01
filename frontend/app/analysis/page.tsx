"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AnalysisPanel from "@/components/AnalysisPanel";
import Sidebar from "@/components/Sidebar";
import { useSessionStore } from "@/components/SessionStore"; // 🔹 NEW

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND || "http://localhost:8000").replace(
  /\/+$/,
  ""
);

type Row = Record<string, any>;

export default function AnalysisPage() {
  const [data, setData] = useState<Row[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");

  // sidebar state for the *fallback* screen
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);

  const router = useRouter();

  // 🔹 session store (persistent sessions + activeSessionId)
  const { sessions, activeSessionId, setActiveSessionId } = useSessionStore();

  // 🔹 derive recentChats from stored sessions
  const recentChats = sessions.map((s) => s.title);

  useEffect(() => {
    // 1) If we have an active session, prefer loading from localStorage
    if (activeSessionId) {
      const session = sessions.find((s) => s.id === activeSessionId);
      if (session) {
        try {
          const raw = localStorage.getItem(
            `novaprowl_session_data_v1_${activeSessionId}`
          );
          if (raw) {
            const parsed = JSON.parse(raw) as {
              fileName?: string;
              data: Row[];
              initialPrompt?: string;
            };

            setData(parsed.data || []);
            setFileName(
              parsed.fileName || session.fileName || "Data Summary Request"
            );
            setPrompt(parsed.initialPrompt || session.firstPrompt || "");
            return; // ✅ we’re done; don’t fall back
          }
        } catch (e) {
          console.error("Failed to load analysis data from localStorage", e);
        }
      }
    }

    // 2) Fallback: old behavior using sessionStorage
    try {
      const raw = sessionStorage.getItem("analysis_dataset");
      const file = sessionStorage.getItem("analysis_file");
      const q = sessionStorage.getItem("analysis_prompt") || "";

      if (raw && file) {
        const parsed: Row[] = JSON.parse(raw);
        setData(parsed);
        setFileName(file);
        setPrompt(q);

        // 🔹 NEW: also sync dataset to backend so /api/query works
        const cols = parsed.length ? Object.keys(parsed[0]) : [];

        fetch(`${BACKEND}/api/sync-dataset`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: file,
            rows: parsed,
            columns: cols,
          }),
        }).catch((err) => {
          console.error("Failed to sync dataset to backend", err);
        });
      }
    } catch (e) {
      console.error("Failed to load analysis data from sessionStorage", e);
    }
  }, []);
  // ✅ If we DO have data + filename, use the full AnalysisPanel (which already has Sidebar inside)
  if (data && fileName) {
    return (
      <AnalysisPanel
        fileName={fileName}
        data={data}
        initialPrompt={prompt}
      />
    );
  }

  // ✅ Fallback: show SAME sidebar layout + message in the main area
  return (
    <div className="max-h-screen bg-[#f4f2ee] text-slate-800 flex">
      {/* Sidebar */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        accountOpen={accountOpen}
        setAccountOpen={setAccountOpen}
        recentChats={recentChats}
        activeSpace="Chat"
        onSpaceChange={(label) => {
          if (label === "Chat") {
            // go back to main interface
            setActiveSessionId(null);
            router.push("/");
          }
        }}
        onSelectChat={(chatTitle) => {
          const session = sessions.find((s) => s.title === chatTitle);
          if (!session) return;

          // set this as active; effect above will load it
          setActiveSessionId(session.id);
        }}
      />

      {/* Main content with message */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            No dataset loaded
          </h1>
          <p className="text-sm text-slate-600">
            Please go back to the home screen, upload a dataset, and ask a question.
            We’ll then bring you back here with a full analysis.
          </p>
        </div>
      </main>
    </div>
  );
}