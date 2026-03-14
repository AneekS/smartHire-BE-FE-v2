"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Download,
  FileText,
  CheckCircle2,
  Upload,
  Loader2,
  FileUp,
  Sparkles,
  BrainCircuit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ATSScorePanel } from "./panels/ATSScorePanel";
import { ResumeEditorPanel } from "./panels/ResumeEditorPanel";
import { FixItSuggestionsPanel } from "./panels/FixItSuggestionsPanel";
import { UpdatedResumeSection } from "./UpdatedResumeSection";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useResumeStore } from "@/store/useResumeStore";

const cardClass = "rounded-2xl border border-gray-100 bg-white shadow-sm";

export function ResumeStudioLayout() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"score" | "editor" | "fixes">("editor");

  const {
    originalContent,
    isLoading,
    isUploading,
    uploadStage,
    error,
    loadResumeFromAPI,
    uploadResume,
  } = useResumeStore();

  useEffect(() => {
    loadResumeFromAPI();
  }, [loadResumeFromAPI]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      uploadResume(e.target.files[0]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA]">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    );
  }

  if (isUploading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#FAFAFA]">
        <motion.div
          key={uploadStage}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`${cardClass} flex max-w-md flex-col items-center p-10 text-center`}
        >
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-violet-100">
            {uploadStage === "uploading" && <FileUp className="h-8 w-8 text-violet-600 animate-bounce" />}
            {uploadStage === "extracting" && <FileText className="h-8 w-8 text-violet-600 animate-pulse" />}
            {uploadStage === "parsing" && <BrainCircuit className="h-8 w-8 text-violet-500 animate-pulse" />}
            {uploadStage === "scoring" && <CheckCircle2 className="h-8 w-8 text-emerald-500 animate-spin" />}
            {uploadStage === "suggesting" && <Sparkles className="h-8 w-8 text-amber-500 animate-pulse" />}
            {uploadStage === "done" && <CheckCircle2 className="h-8 w-8 text-emerald-500" />}
          </div>
          <h3 className="text-xl font-bold text-gray-900 capitalize">{uploadStage}...</h3>
          <p className="mt-2 text-sm text-gray-500">Please wait while AI analyzes your resume.</p>
        </motion.div>
      </div>
    );
  }

  if (!originalContent) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FAFAFA] text-gray-900">
        <div className="flex flex-1 items-center justify-center p-6">
          <div className={`flex w-full max-w-lg flex-col items-center ${cardClass} p-10`}>
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-violet-100">
              <Upload className="h-8 w-8 text-violet-600" />
            </div>
            <h3 className="mb-2 text-2xl font-bold text-gray-900">Upload Your Resume</h3>
            <p className="text-gray-600 font-medium">Upload a PDF or DOCX file to get started</p>
            <p className="mt-1 text-sm text-gray-500">Your resume will appear here for editing</p>

            {error && (
              <div className="mb-6 mt-6 w-full rounded-xl border border-red-100 bg-red-50/80 p-4 text-center">
                <p className="text-sm font-semibold text-red-600">Upload Failed</p>
                <p className="mt-1.5 text-xs text-red-500">{error}</p>
                <p className="mt-2 text-xs text-gray-500">Make sure your PDF is text-based (not a scanned image).</p>
              </div>
            )}

            <label className="mt-8 cursor-pointer">
              <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleUpload} />
              <span className="flex items-center gap-2 rounded-full bg-violet-600 px-8 py-4 font-bold text-white shadow-sm transition hover:bg-violet-700">
                <Upload className="h-4 w-4" />
                Choose File
              </span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-transparent text-gray-900">
      {/* Header — white, soft shadow (no dark bg) */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 flex h-20 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 shadow-sm md:px-8"
      >
        <div className="flex items-center gap-3 md:gap-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
            className="rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
              <FileText className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-gray-900 md:text-xl">
                Resume Studio
              </h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                Analyzing resume
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="outline"
            className="hidden rounded-full border-gray-200 bg-white px-6 text-xs font-semibold text-gray-700 hover:bg-gray-50 md:flex"
          >
            Settings
          </Button>
          <Button className="rounded-full bg-violet-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-violet-700 md:px-6">
            <Download className="mr-2 h-3.5 w-3.5" />
            <span className="hidden md:inline">Export Options</span>
            <span className="md:hidden">Export</span>
          </Button>
        </div>
      </motion.header>

      {/* Mobile tabs — pill style */}
      <div className="flex border-b border-gray-100 bg-white lg:hidden">
        {(["score", "editor", "fixes"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider ${
              activeTab === tab ? "border-b-2 border-violet-600 text-violet-600" : "text-gray-500"
            }`}
          >
            {tab === "score" ? "Score" : tab === "editor" ? "Editor" : "Fixes"}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 lg:pb-6" id="resume-main-scroll">
        <div className="mb-8 flex h-[calc(100vh-8.5rem)] w-full gap-4 xl:gap-6">
          <div
            className={`w-full lg:flex lg:w-[280px] xl:w-[320px] lg:shrink-0 ${activeTab === "score" ? "flex" : "hidden"}`}
          >
            <ATSScorePanel onViewSection={() => setActiveTab("fixes")} />
          </div>
          <div className={`min-w-0 flex-1 ${activeTab === "editor" ? "flex" : "hidden"} lg:flex`}>
            <ResumeEditorPanel />
          </div>
          <div
            className={`w-full lg:flex lg:w-[300px] xl:w-[340px] lg:shrink-0 ${activeTab === "fixes" ? "flex" : "hidden"}`}
          >
            <FixItSuggestionsPanel />
          </div>
        </div>
        <UpdatedResumeSection />
      </div>

      {/* Mobile bottom bar — light */}
      <div className="absolute bottom-0 left-0 z-20 flex w-full items-center justify-between border-t border-gray-100 bg-white p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] lg:hidden">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Action Center</span>
        <Button
          onClick={() => setActiveTab("fixes")}
          className="rounded-full bg-violet-600 text-xs font-semibold hover:bg-violet-700"
        >
          Review Actions
        </Button>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .thin-scrollbar::-webkit-scrollbar { width: 6px; }
            .thin-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .thin-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
            .thin-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.15); }
            .section-highlight { animation: sectionPulse 2s ease; }
            @keyframes sectionPulse { 0%, 100% { background: transparent; } 30% { background: rgba(124,58,237,0.08); } }
          `,
        }}
      />
    </div>
  );
}
