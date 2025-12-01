"use client";

import React, { useRef } from "react";
import {
  X,
  UploadCloud,
  Globe,
  Link as LinkIcon,
  FileText,
  Youtube,
  Copy,
  HardDrive,
} from "lucide-react";

type NotebookSourcesModalProps = {
  open: boolean;
  onClose: () => void;
  onFilesSelected?: (files: FileList) => void;
};

export default function UploadData({
  open,
  onClose,
  onFilesSelected,
}: NotebookSourcesModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    onFilesSelected?.(e.target.files);
  };

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="relative w-full max-w-4xl mx-4 rounded-2xl bg-[#16181d] text-slate-50 shadow-2xl border border-white/5 overflow-hidden">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 h-9 w-9 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-200"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="px-8 pt-7 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2 mb-1">
            
            <span className="text-sm font-medium text-slate-100">
              NovaProwl
            </span>
          </div>
          <h2 className="text-lg font-semibold text-slate-50">Add sources</h2>
          <p className="mt-1 text-sm text-slate-400 leading-relaxed max-w-2xl">
            Sources let NotebookLM base its responses on the information that
            matters most to you. (Examples: marketing plans, course reading,
            research notes, meeting transcripts, sales documents, etc.)
          </p>
        </div>

        {/* Upload area */}
        <div className="px-8 pt-6 pb-4">
          <div className="rounded-2xl border border-dashed border-slate-600 bg-black/20 px-6 py-[100px] flex flex-col items-center justify-center text-center">
            <div 
             onClick={handleChooseFile}
            className="h-12 w-12 rounded-full bg-slate-700/40 flex items-center justify-center mb-4 hover:opacity-[70%] cursor-pointer">
              <UploadCloud className="w-6 h-6 text-slate-100 " />
            </div>
        
            <p className="mt-1 text-sm text-slate-400">
              Drag and drop or{" "}
              <button
                type="button"
                onClick={handleChooseFile}
                className="text-sky-400 hover:underline"
              >
                Choose file
              </button>{" "}
              to upload
            </p>
            <p className="mt-3 text-[11px] text-slate-500 max-w-xl">
              Supported file types: .csv, .xlsx
            </p>

            {/* hidden input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
          </div>
        </div>

        {/* Source options row */}
        <div className="px-8 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Google Workspace / Drive */}
            <div className="rounded-2xl bg-white/5 border border-white/10 py-3 space-y-2">
              <div className="flex justify-center items-center px-4 py-3 gap-2">
                <HardDrive className="w-4 h-4 text-slate-100" />
                <span className="font-medium text-slate-50">
                  Google Workspace
                </span>
              </div>
              <button className="w-[80%] mt-1 flex items-center justify-center mx-auto rounded-xl bg-black/40 border border-white/10 px-3 py-1.5 text-[11px] text-slate-100 hover:bg-black/60">
                <span className="flex items-center p-3 gap-2">
                  <div className="h-4 w-4 rounded-[4px] bg-slate-100 flex items-center justify-center text-[10px] text-black font-bold">
                    G
                  </div>
                  Google Drive
                </span>
              </button>
            </div>

             <div className="rounded-2xl bg-white/5 border border-white/10 py-3 space-y-2">
              <div className="flex justify-center items-center px-4 py-3 gap-2">
                <HardDrive className="w-4 h-4 text-slate-100" />
                <span className="font-medium text-slate-50">
                  Google Workspace
                </span>
              </div>
              <button className="w-[80%] mt-1 flex items-center justify-center mx-auto rounded-xl bg-black/40 border border-white/10 px-3 py-1.5 text-[11px] text-slate-100 hover:bg-black/60">
                <span className="flex items-center p-3 gap-2">
                  <div className="h-4 w-4 rounded-[4px] bg-slate-100 flex items-center justify-center text-[10px] text-black font-bold">
                    G
                  </div>
                  Google Drive
                </span>
              </button>
            </div>

             <div className="rounded-2xl bg-white/5 border border-white/10 py-3 space-y-2">
              <div className="flex justify-center items-center px-4 py-3 gap-2">
                <HardDrive className="w-4 h-4 text-slate-100" />
                <span className="font-medium text-slate-50">
                  Google Workspace
                </span>
              </div>
              <button className="w-[80%] mt-1 flex  justify-center items-center mx-auto rounded-xl bg-black/40 border border-white/10 px-3 py-1.5 text-[11px] text-slate-100 hover:bg-black/60">
                <span className="flex items-center p-3 gap-2">
                  <div className="h-4 w-4 rounded-[4px] bg-slate-100 flex items-center justify-center text-[10px] text-black font-bold">
                    G
                  </div>
                  Google Drive
                </span>
              </button>
            </div>
            

            


           
          </div>
        </div>

        {/* Bottom progress / source limit */}
        <div className="px-8 pb-5 pt-2 border-t border-white/5">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400">Source limit</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full w-1/4 bg-slate-300/80" />
            </div>
            <span className="text-[11px] text-slate-400">0/50</span>
          </div>
        </div>
      </div>
    </div>
  );
}
