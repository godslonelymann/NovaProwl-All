"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useSessionStore } from "@/components/SessionStore";
import { LogoutButton } from "@/components/LogoutButton";

export default function OCRPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const { sessions, setActiveSessionId } = useSessionStore();
  const recentChats = sessions.map((s) => s.title);

  // ✅ Local state for sidebar & account dropdown so Sidebar can actually work
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  const user = session?.user;

  return (
    <div className="h-screen bg-[#f4f2ee] text-slate-800 flex overflow-hidden">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        accountOpen={accountOpen}
        setAccountOpen={setAccountOpen}
        recentChats={recentChats}
        // visually we can still treat this as "Chat" space for now
        activeSpace="Chat"
        onSpaceChange={(label) => {
          if (label === "Chat") {
            router.push("/mainInterface");
          }
        }}
        onSelectChat={(chatTitle) => {
          const sess = sessions.find((s) => s.title === chatTitle);
          if (!sess) return;
          setActiveSessionId(sess.id);
          router.push("/analysis");
        }}
      />

      <main className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold text-slate-900">
              OCR Tool
            </h1>
           
          </div>
          <button
            onClick={() => router.push("/mainInterface")}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-medium hover:bg-slate-800"
          >
            Back to Dashboard
          </button>
        </div>

        {/* You can add more profile content here if you want */}
        
      </main>
    </div>
  );
}