"use client";
import Link from "next/link";

import React, { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MessageCircle,
  FunctionSquare,
  FileText,
  Layers,
  Pencil,
  Trash2,
  User,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast"; // ✅ adjust path if needed
import { useRouter } from "next/navigation";
import { useSessionStore } from "./SessionStore";

type SidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  accountOpen: boolean;
  setAccountOpen: (open: boolean) => void;
  recentChats: string[];

  // 🔹 NEW (optional) dynamics
  activeSpace?: string; // "Chat" | "Explore" | "Playbooks"
  onSpaceChange?: (spaceLabel: string) => void;

  activeTool?: string;
  onToolClick?: (toolLabel: string) => void;

  // when a recent chat is clicked
  onSelectChat?: (chatTitle: string) => void;

  onChatsEmpty?: () => void; // ✅ NEW
};

const spaces = [{ icon: MessageCircle, label: "Chat" }];

const tools = [
  { icon: FunctionSquare, label: "OCR Tool", link: "ocrTool" },
  { icon: FileText, label: "Data Cleaner Tool", link: "dataCleaning" },
];

const STORAGE_KEY = "novaprowl_sidebar_chats_v2";

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  accountOpen,
  setAccountOpen,
  recentChats,

  activeSpace,
  onSpaceChange,
  activeTool,
  onToolClick,
  onSelectChat,
  onChatsEmpty,
}: SidebarProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { setActiveSessionId } = useSessionStore();

  // ✅ Local sidebar chat titles (independent of parent state)
  const [chatTitles, setChatTitles] = useState<string[]>([]);

  // ✅ Inline rename state (replaces window.prompt)
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // ✅ Load from localStorage OR initial recentChats
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // use stored chats only if it's a non-empty array
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatTitles(parsed);
          return;
        }
      }

      // fallback to prop recentChats when no valid stored chats
      if (recentChats && recentChats.length > 0) {
        setChatTitles(recentChats);
      }
    } catch (err) {
      console.error("Failed to load sidebar chats:", err);
      // on error, still try to use recentChats
      if (recentChats && recentChats.length > 0) {
        setChatTitles(recentChats);
      }
    }
  }, [recentChats]); // 🔹 depend on recentChats so first title shows up

  // Persist sidebar chat titles
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chatTitles));
    } catch (err) {
      console.error("Failed to save sidebar chats:", err);
    }
  }, [chatTitles]);

  // Start rename (no prompt, just set editing state)
  const handleRenameChat = (index: number) => {
    const current = chatTitles[index] ?? "";
    setEditingIndex(index);
    setEditingValue(current);
  };

  // Apply rename when user confirms (Enter / blur)
  const commitRename = () => {
    if (editingIndex === null) return;
    const trimmed = editingValue.trim();
    if (!trimmed) {
      // If empty, just cancel without changing
      setEditingIndex(null);
      setEditingValue("");
      return;
    }

    setChatTitles((prev) => {
      const copy = [...prev];
      copy[editingIndex] = trimmed;
      return copy;
    });

    setEditingIndex(null);
    setEditingValue("");
  };

  // Cancel rename (Esc)
  const cancelRename = () => {
    setEditingIndex(null);
    setEditingValue("");
  };

  // Delete a chat title (no window.confirm, show toast instead)
  const handleDeleteChat = (index: number) => {
    const title = chatTitles[index] || "Untitled chat";

    setChatTitles((prev) => {
      const updated = prev.filter((_, i) => i !== index);

      // 🔥 if no chats left → notify parent to redirect
      if (updated.length === 0 && onChatsEmpty) {
        setTimeout(() => onChatsEmpty(), 50);
      }

      return updated;
    });

    // ✅ Show toast notification instead of confirm()
    toast({
      title: "Chat deleted",
      description: `"${title}" has been removed from recent chats.`,
    });

    // If we were editing this chat, clear editing state
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingValue("");
    }
  };

  return (
    <div
      className={`relative border-r border-slate-200 bg-white flex flex-col transition-all duration-300 ease-out
      ${sidebarOpen ? "w-64" : "w-[70px]"}`}
    >
      {/* Collapse / expand button */}
      <button
        className="absolute -right-3 top-6 z-20 h-6 w-6 rounded-full bg-white shadow flex items-center justify-center border border-slate-200"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-500" />
        )}
      </button>

      {/* Logo / top spacing */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-6">
        {sidebarOpen && (
          <Link href={"/mainInterface"} className="text-sm font-semibold text-slate-700">
            NovaProwl
          </Link>
        )}
      </div>

      {/* Spaces */}
      <div className="px-3">
        {sidebarOpen && <p className="text-sm text-slate-700 mb-1">Spaces</p>}
        <nav className="space-y-1 mb-4">
          {spaces.map((item) => {
            const Icon = item.icon;
            const isActive = activeSpace === item.label;

            return (
              <button
                key={item.label}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors
                  ${
                    isActive
                      ? "bg-slate-200 text-slate-900" // 🔹 light gray active
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  }`}
                onClick={() => {
                  onSpaceChange?.(item.label);
                  if (item.label === "Chat") {
                    const newSessionId = "session_" + Date.now().toString();
                    setActiveSessionId(newSessionId);
                    sessionStorage.setItem(
                      "analysis_messages_" + newSessionId,
                      "[]"
                    );
                    router.push("/mainInterface");
                  }
                }}
              >
                <Icon className="w-4 h-4" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tools */}
      <div className="px-3">
        {sidebarOpen && <p className="text-sm text-slate-700 mb-1">Tools</p>}
        <nav className="space-y-1 mb-4">
          {tools.map((item) => {
            const Icon = item.icon;
            const isActive = activeTool === item.label;

            return (
              <Link
                href={item.link}
                key={item.label}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors
                  ${
                    isActive
                      ? "bg-slate-200 text-slate-900" // 🔹 light gray active
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  }`}
                onClick={() => onToolClick?.(item.label)}
              >
                <Icon className="w-4 h-4" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Recent chats */}
      <div className="px-3 flex-1 overflow-hidden">
        {sidebarOpen && chatTitles.length > 0 && (
          <>
            <p className="text-sm text-slate-700 mb-1">Recent chats</p>
            <div className="space-y-1 text-sm text-slate-500 overflow-y-auto pr-1">
              {chatTitles.map((chat, idx) => {
                const isEditing = editingIndex === idx;

                return (
                  <div
                    key={`${chat}-${idx}`}
                    className="w-full flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-slate-100"
                  >
                    {/* Main clickable area to select chat OR inline edit */}
                    {isEditing ? (
                      <input
                        className="flex-1 truncate text-left px-1 py-1 text-sm border border-slate-300 rounded-md bg-white"
                        value={editingValue}
                        autoFocus
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") cancelRename();
                        }}
                      />
                    ) : (
                      <button
                        className="flex-1 truncate text-left px-1 py-1 hover:text-slate-700"
                        title={chat}
                        onClick={() => onSelectChat?.(chat)}
                      >
                        {chat || "Untitled chat"}
                      </button>
                    )}

                    {/* Rename button */}
                    <button
                      className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-slate-200 text-slate-500"
                      title="Rename chat"
                      type="button"
                      onClick={() => handleRenameChat(idx)}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>

                    {/* Delete button */}
                    <button
                      className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-slate-200 text-slate-500"
                      title="Delete chat"
                      type="button"
                      onClick={() => handleDeleteChat(idx)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Account Section */}
      <div className="px-3 py-3 border-t border-slate-200">
        {sidebarOpen ? (
          <div className="space-y-2">
            <div className="relative">
              <button
                className="flex items-center justify-between w-full rounded-2xl p-3 bg-slate-900 text-white text-xs"
                onClick={() => setAccountOpen(!accountOpen)}
              >
                <span className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-sm font-semibold">
                    A
                  </span>
                  <span className="text-sm">Anurag</span>
                </span>
                {accountOpen ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>

              {accountOpen && (
                <div className="absolute bottom-14 left-0 w-full p-3 rounded-xl bg-white shadow-lg border border-slate-200 text-sm text-slate-700 overflow-hidden z-20">
                  <Link
                    href="/profile"
                    className="block w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="block w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <SettingsIcon className="w-4 h-4" />
                    Settings
                  </Link>
                  <button
                    className="block w-full text-left px-3 py-2 hover:bg-slate-50 text-red-500 flex items-center gap-2"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-semibold">
              A
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
