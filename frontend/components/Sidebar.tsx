"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MessageCircle,
  Compass,
  BookOpen,
  FunctionSquare,
  FileText,
  PlugZap,
} from "lucide-react";

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
};

const spaces = [
  { icon: MessageCircle, label: "Chat" },
];

const tools = [
  { icon: FunctionSquare, label: "OCR Tool" },
  { icon: FileText, label: "Data Cleaner Tool" },
];

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
}: SidebarProps) {
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
        <div className="h-7 w-7 rounded-lg bg-slate-900 flex items-center justify-center" />
        {sidebarOpen && (
          <span className="text-sm font-semibold text-slate-700">
            NovaProwl
          </span>
        )}
      </div>

      {/* Spaces */}
      <div className="px-3">
        {sidebarOpen && (
          <p className="text-sm text-slate-700 mb-1">
            Spaces
          </p>
        )}
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
                      ? "bg-slate-200 text-slate-900"  // 🔹 light gray active
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  }`}
                onClick={() => onSpaceChange?.(item.label)}
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
        {sidebarOpen && (
          <p className="text-sm text-slate-700 mb-1">
            Tools
          </p>
        )}
        <nav className="space-y-1 mb-4">
          {tools.map((item) => {
            const Icon = item.icon;
            const isActive = activeTool === item.label;

            return (
              <button
                key={item.label}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors
                  ${
                    isActive
                      ? "bg-slate-200 text-slate-900"  // 🔹 light gray active
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  }`}
                onClick={() => onToolClick?.(item.label)}
              >
                <Icon className="w-4 h-4" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Recent chats */}
      <div className="px-3 flex-1 overflow-hidden">
        {sidebarOpen && recentChats.length > 0 && (  /* 🔹 only show when there are chats */
          <>
            <p className="text-sm text-slate-700 mb-1">
              Recent chats
            </p>
            <div className="space-y-1 text-sm text-slate-500 overflow-y-auto pr-1">
              {recentChats.map((chat, idx) => (
                <button
                  key={idx}
                  className="w-full truncate text-left rounded-lg px-3 py-2 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  title={chat}
                  onClick={() => onSelectChat?.(chat)}
                >
                  {chat}
                </button>
              ))}
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
                  <button className="block w-full text-left px-3 py-2 hover:bg-slate-50">
                    Profile
                  </button>
                  <button className="block w-full text-left px-3 py-2 hover:bg-slate-50">
                    Billing
                  </button>
                  <button className="block w-full text-left px-3 py-2 hover:bg-slate-50">
                    Settings
                  </button>
                  <button className="block w-full text-left px-3 py-2 hover:bg-slate-50 text-red-500">
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