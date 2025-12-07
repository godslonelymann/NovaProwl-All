"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useSessionStore } from "@/components/SessionStore";
import { LogoutButton } from "@/components/LogoutButton";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { sessions, setActiveSessionId } = useSessionStore();
  const recentChats = sessions.map((s) => s.title);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  const user = session?.user;

  return (
    <div className="h-screen bg-[#f4f2ee] text-slate-800 flex overflow-hidden">
      <Sidebar
        sidebarOpen={true}
        setSidebarOpen={() => {}}
        accountOpen={false}
        setAccountOpen={() => {}}
        recentChats={recentChats}
        activeSpace="Profile"
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
              Your Profile
            </h1>
            <p className="text-xs text-slate-500">
              View your NovaProwl identity and account details.
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
