"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useSessionStore } from "@/components/SessionStore";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { sessions, setActiveSessionId } = useSessionStore();
  const recentChats = sessions.map((s) => s.title);

  const [appearance, setAppearance] = useState<"Light" | "Dark" | "System">(
    "Light"
  );
  const [notifyMatches, setNotifyMatches] = useState(true);
  const [notifyUpdates, setNotifyUpdates] = useState(true);
  const [showTips, setShowTips] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  return (
    <div className="h-screen bg-[#f4f2ee] text-slate-800 flex overflow-hidden">
      <Sidebar
        sidebarOpen={true}
        setSidebarOpen={() => {}}
        accountOpen={false}
        setAccountOpen={() => {}}
        recentChats={recentChats}
        activeSpace="Settings"
        onSpaceChange={(label) => {
          if (label === "Chat") router.push("/mainInterface");
        }}
        onSelectChat={(chatTitle) => {
          const session = sessions.find((s) => s.title === chatTitle);
          if (!session) return;
          setActiveSessionId(session.id);
          router.push("/analysis");
        }}
      />

      <main className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
          <div className="flex flex-col">
            
            <h1 className="text-xl font-semibold text-slate-900">
              Settings
            </h1>
            <p className="text-xs text-slate-500">
              Update how NovaProwl behaves for your account.
            </p>
          </div>
          <button
            onClick={() => router.push("/mainInterface")}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-medium hover:bg-slate-800"
          >
            Back to Dashboard
          </button>
        </div>

       
      </main>
    </div>
  );
}
