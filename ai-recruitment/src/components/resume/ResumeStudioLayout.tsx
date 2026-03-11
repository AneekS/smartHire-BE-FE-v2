"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Download, FileText, CheckCircle2, Upload, Loader2, FileUp, Sparkles, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ATSScorePanel } from "./panels/ATSScorePanel";
import { ResumeEditorPanel } from "./panels/ResumeEditorPanel";
import { FixItSuggestionsPanel } from "./panels/FixItSuggestionsPanel";
import { UpdatedResumeSection } from "./UpdatedResumeSection";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useResumeStore } from "@/store/useResumeStore";

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
        uploadResume
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
            <div className="flex h-screen items-center justify-center bg-[#F4F4F5]">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    if (isUploading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#F4F4F5]">
                <div className="glass-panel p-10 rounded-3xl max-w-md w-full text-center flex flex-col items-center">
                    <motion.div
                        key={uploadStage}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6"
                    >
                        {uploadStage === "uploading" && <FileUp className="w-8 h-8 text-primary animate-bounce" />}
                        {uploadStage === "extracting" && <FileText className="w-8 h-8 text-primary animate-pulse" />}
                        {uploadStage === "parsing" && <BrainCircuit className="w-8 h-8 text-indigo-500 animate-pulse" />}
                        {uploadStage === "scoring" && <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-spin" />}
                        {uploadStage === "suggesting" && <Sparkles className="w-8 h-8 text-amber-500 animate-pulse" />}
                        {uploadStage === "done" && <CheckCircle2 className="w-8 h-8 text-emerald-500" />}
                    </motion.div>

                    <h3 className="text-xl font-bold text-slate-900 mb-2 capitalize">{uploadStage}...</h3>
                    <p className="text-sm text-slate-500 font-medium">Please wait while AI analyzes your resume.</p>
                </div>
            </div>
        );
    }

    if (!originalContent) {
        return (
            <div className="flex flex-col h-screen max-h-screen bg-[#F4F4F5] text-slate-900 overflow-hidden relative">
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="flex flex-col items-center justify-center w-full max-w-lg glass-panel p-10 rounded-3xl border border-white">
                        <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mb-6">
                            <Upload className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div className="text-center mb-8">
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Upload Your Resume</h3>
                            <p className="text-slate-600 font-medium">Upload a PDF or DOCX file to get started</p>
                            <p className="text-slate-500 text-sm mt-1">Your real resume will appear here for editing</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-center w-full">
                                <p className="text-red-500 text-sm font-bold flex items-center justify-center gap-1.5">
                                    Upload Failed
                                </p>
                                <p className="text-red-400 text-xs mt-1.5">{error}</p>
                                <p className="text-slate-500 text-xs mt-2 font-medium">
                                    Make sure your PDF is text-based (not a scanned image).
                                </p>
                            </div>
                        )}

                        <label className="cursor-pointer">
                            <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleUpload} />
                            <div className="px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center gap-2">
                                <Upload className="w-4 h-4" />
                                Choose File
                            </div>
                        </label>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen max-h-screen bg-[#F4F4F5] text-slate-900 overflow-hidden relative">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[150px]"></div>
            </div>

            {/* Top Header */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-none h-20 px-4 md:px-8 flex items-center justify-between z-10 border-b border-white/20 bg-white/60 backdrop-blur-xl shadow-sm"
            >
                <div className="flex items-center gap-3 md:gap-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/resume")}
                        className="rounded-full hover:bg-slate-100"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </Button>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex p-2.5 bg-primary/10 rounded-xl border border-primary/20">
                            <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="font-display font-black text-lg md:text-xl tracking-tight leading-none text-slate-900">
                                Resume Studio
                            </h1>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                Analyzing Real Resume
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <Button variant="outline" className="hidden md:flex rounded-full px-6 font-bold text-xs bg-white border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900">
                        Settings
                    </Button>
                    <Button className="rounded-full px-4 md:px-6 font-bold text-xs bg-primary hover:opacity-90 transition-opacity gap-2 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Export Options</span>
                        <span className="md:hidden">Export</span>
                    </Button>
                </div>
            </motion.header>

            {/* Mobile Tabs */}
            <div className="lg:hidden flex border-b border-slate-200 bg-white z-10">
                <button
                    onClick={() => setActiveTab("score")}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'score' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}
                >
                    Score
                </button>
                <button
                    onClick={() => setActiveTab("editor")}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'editor' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}
                >
                    Editor
                </button>
                <button
                    onClick={() => setActiveTab("fixes")}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'fixes' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}
                >
                    Fixes
                </button>
            </div>

            {/* Main Content Scroll Area */}
            <div className="flex-1 overflow-y-auto thin-scrollbar p-4 md:p-6 z-10 pb-20 lg:pb-6" id="resume-main-scroll">
                {/* Top 3-Panel Layout */}
                <div className="flex h-[calc(100vh-140px)] w-full gap-4 xl:gap-6 mb-8">
                    <div className={`w-full lg:w-[280px] xl:w-[320px] lg:shrink-0 lg:flex ${activeTab === 'score' ? 'flex' : 'hidden'}`}>
                        <ATSScorePanel />
                    </div>
                    <div className={`w-full lg:flex-1 lg:flex ${activeTab === 'editor' ? 'flex' : 'hidden'} min-w-0`}>
                        <ResumeEditorPanel />
                    </div>
                    <div className={`w-full lg:w-[300px] xl:w-[340px] lg:shrink-0 lg:flex ${activeTab === 'fixes' ? 'flex' : 'hidden'}`}>
                        <FixItSuggestionsPanel />
                    </div>
                </div>

                {/* ✨ Live Diff Updated Section ✨ */}
                <UpdatedResumeSection />
            </div>

            {/* Mobile Bottom Sticky Bar */}
            <div className="lg:hidden absolute bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 flex items-center justify-between z-20 shadow-lg">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action Center</span>
                </div>
                <Button onClick={() => setActiveTab("fixes")} className="bg-emerald-500 hover:bg-emerald-600 font-bold text-xs rounded-full">
                    Review Actions
                </Button>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .glass-panel {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.05);
        }
        .thin-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .thin-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .thin-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }
        .thin-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.2);
        }
        .fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
        </div>
    );
}
