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

export default function AnalysisPage() {
  const [allDatasets, setAllDatasets] = useState<UploadedDataset[] | null>(
    null
  );
  const [activeDatasetId, setActiveDatasetId] = useState<string | undefined>(
    undefined
  );
  const [prompt, setPrompt] = useState<string>("");

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const { sessions, activeSessionId, setActiveSessionId } = useSessionStore();

  const recentChats = sessions.map((s) => s.title);

  useEffect(() => {
    let cancelled = false;

    const loadFromLocalStorage = () => {
      try {
        if (typeof window === "undefined") {
          setLoading(false);
          return;
        }

        if (!activeSessionId) {
          setLoading(false);
          return;
        }

        const storageKey = `novaprowl_session_data_v1_${activeSessionId}`;
        const raw = localStorage.getItem(storageKey);

        if (!raw) {
          setLoading(false);
          return;
        }

        const parsed = JSON.parse(raw) as {
          datasets?: UploadedDataset[];
          activeDatasetId?: string;
          initialPrompt?: string;
        };

        if (
          !parsed ||
          !Array.isArray(parsed.datasets) ||
          parsed.datasets.length === 0
        ) {
          setLoading(false);
          return;
        }

        if (cancelled) return;

        setAllDatasets(parsed.datasets);

        const active =
          parsed.datasets.find((d) => d.id === parsed.activeDatasetId) ||
          parsed.datasets[0];

        setActiveDatasetId(active?.id);
        setPrompt(typeof parsed.initialPrompt === "string" ? parsed.initialPrompt : "");
      } catch (e) {
        console.error("Failed to load analysis data from localStorage", e);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadFromLocalStorage();

    return () => {
      cancelled = true;
    };
  }, [activeSessionId]);

  // ⏳ Loading state while we read from localStorage
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f4f2ee] text-slate-600 text-sm">
        Loading dataset…
      </div>
    );
  }

  // ✅ We have datasets + an active one → render full analysis experience
  if (allDatasets && allDatasets.length && activeDatasetId) {
    return (
      <AnalysisPanel
        datasets={allDatasets}
        activeDatasetId={activeDatasetId}
        initialPrompt={prompt}
      />
    );
  }

  // ❌ Fallback: nothing loaded → show existing "No dataset loaded" screen
  return (
    <div className="max-h-screen bg-[#f4f2ee] text-slate-800 flex">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        accountOpen={accountOpen}
        setAccountOpen={setAccountOpen}
        recentChats={recentChats}
        activeSpace="Chat"
        onSpaceChange={(label) => {
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
