// app/analysis/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AnalysisPanel from "@/components/AnalysisPanel";
import Sidebar from "@/components/Sidebar";
import { useSessionStore } from "@/components/SessionStore";

type Row = Record<string, any>;

type UploadedDataset = {
  id: string;
  fileName: string;
  rows: Row[];
  columns?: string[];
  extension?: string;
  kind?: string;
  textContent?: string;
};

const collectColumns = (rows: Row[]): string[] => {
  if (!rows.length) return [];
  const keys = new Set<string>();
  rows.forEach((r) => Object.keys(r || {}).forEach((k) => keys.add(k)));
  return Array.from(keys);
};

export default function AnalysisPage() {
  const [allDatasets, setAllDatasets] = useState<UploadedDataset[] | null>(
    null
  );
  const [activeDatasetId, setActiveDatasetId] = useState<string | undefined>(
    undefined
  );
  const [fileName, setFileName] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [activeSpace, setActiveSpace] = useState<string>("Chat");

  const router = useRouter();
  const { sessions, activeSessionId, setActiveSessionId } = useSessionStore();

  // 🔹 This is what Sidebar uses to render "Recent chats"
  const recentChats = sessions.map((s) => s.title);

  // ----- Load datasets + initial prompt for the active session -----
  useEffect(() => {
    // 1) Preferred: load from persistent session data in localStorage
    if (activeSessionId) {
      const session = sessions.find((s) => s.id === activeSessionId);
      if (session) {
        try {
          const raw = localStorage.getItem(
            `novaprowl_session_data_v1_${activeSessionId}`
          );
          if (raw) {
            const parsed = JSON.parse(raw) as {
              datasets?: UploadedDataset[];
              activeDatasetId?: string;
              initialPrompt?: string;
              fileName?: string;
              data?: Row[];
            };

            if (parsed.datasets && parsed.datasets.length > 0) {
              setAllDatasets(parsed.datasets);
              const active =
                parsed.datasets.find((d) => d.id === parsed.activeDatasetId) ||
                parsed.datasets[0];
              setActiveDatasetId(active?.id);
              setFileName(active?.fileName || "");
              setPrompt(parsed.initialPrompt || session.firstPrompt || "");
              return;
            }

            // legacy single dataset shape
            if (parsed.data && parsed.fileName) {
              const legacyColumns = collectColumns(parsed.data);
              const legacyDataset: UploadedDataset = {
                id: "legacy-dataset",
                fileName: parsed.fileName,
                rows: parsed.data,
                columns: legacyColumns,
              };
              setAllDatasets([legacyDataset]);
              setActiveDatasetId(legacyDataset.id);
              setFileName(parsed.fileName);
              setPrompt(parsed.initialPrompt || session.firstPrompt || "");
              return;
            }
          }
        } catch (e) {
          console.error("Failed to load analysis data from localStorage", e);
        }
      }
    }

    // 2) Fallback: old sessionStorage behaviour (if no activeSessionId or no localStorage data)
    try {
      const raw = sessionStorage.getItem("analysis_dataset");
      const file = sessionStorage.getItem("analysis_file");
      const q = sessionStorage.getItem("analysis_prompt") || "";

      if (raw && file) {
        const parsed: Row[] = JSON.parse(raw);
        const legacyColumns = collectColumns(parsed);
        const legacyDataset: UploadedDataset = {
          id: "legacy-dataset",
          fileName: file,
          rows: parsed,
          columns: legacyColumns,
        };
        setAllDatasets([legacyDataset]);
        setActiveDatasetId(legacyDataset.id);
        setFileName(file);
        setPrompt(q);
      }
    } catch (e) {
      console.error("Failed to load analysis data from sessionStorage", e);
    }
  }, [activeSessionId, sessions]);

  // ----- If we have datasets, show full AnalysisPanel with Sidebar wired -----
  if (allDatasets && allDatasets.length && activeDatasetId) {
    return (
      <AnalysisPanel
        datasets={allDatasets}
        activeDatasetId={activeDatasetId}
        initialPrompt={prompt}
        sessionId={activeSessionId}
        // 🔹 pass recent chats + sidebar state + handlers down
        recentChats={recentChats}
        activeSpace={activeSpace}
        onSpaceChange={(label) => {
          setActiveSpace(label);
          if (label === "Chat") {
            // "New Chat" behavior from analysis → go home & reset session
            setActiveSessionId(null);
            router.push("/mainInterface");
          }
        }}
        onSelectChat={(chatTitle) => {
          const session = sessions.find((s) => s.title === chatTitle);
          if (!session) return;
          setActiveSessionId(session.id);
          // NOTE: staying on /analysis, but AnalysisPanel + this page will re-read
          // the data for the new activeSessionId because of the useEffect above.
        }}
      />
    );
  }

  // ----- No dataset loaded: keep a lightweight fallback with Sidebar -----
  return (
    <div className="max-h-screen bg-[#f4f2ee] text-slate-800 flex">
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
            router.push("/mainInterface");
          }
        }}
        onSelectChat={(chatTitle) => {
          const session = sessions.find((s) => s.title === chatTitle);
          if (!session) return;
          setActiveSessionId(session.id);
        }}
      />

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            No dataset loaded
          </h1>
          <p className="text-sm text-slate-600">
            Please go back to the home screen, upload a dataset, and ask a
            question.
          </p>
        </div>
      </main>
    </div>
  );
}