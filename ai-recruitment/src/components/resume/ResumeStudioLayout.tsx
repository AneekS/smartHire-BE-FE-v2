"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Download, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorProvider } from "./EditorContext";
import { ATSScorePanel } from "./panels/ATSScorePanel";
import { ResumeEditorPanel } from "./panels/ResumeEditorPanel";
import { FixItSuggestionsPanel } from "./panels/FixItSuggestionsPanel";
import { UpdatedResumeSection } from "./UpdatedResumeSection";
import { useRouter } from "next/navigation";

import { useState } from "react";

interface ResumeStudioLayoutProps {
    initialData?: any;
}

export function ResumeStudioLayout({ initialData }: ResumeStudioLayoutProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"score" | "editor" | "fixes">("editor");

    return (
        <EditorProvider initialResume={initialData}>
            <div className="flex flex-col h-screen max-h-screen bg-[#0F0F13] text-slate-100 overflow-hidden relative">
                {/* Background Gradients */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[150px]"></div>
                    <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[150px]"></div>
                </div>

                {/* Top Header */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-none h-20 px-4 md:px-8 flex items-center justify-between z-10 border-b border-slate-800/50 bg-[#0F0F13]/80 backdrop-blur-xl"
                >
                    <div className="flex items-center gap-3 md:gap-6">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push("/resume")}
                            className="rounded-full hover:bg-slate-800"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-400" />
                        </Button>

                        <div className="flex items-center gap-3">
                            <div className="hidden md:flex p-2.5 bg-primary/10 rounded-xl border border-primary/20">
                                <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="font-display font-black text-lg md:text-xl tracking-tight leading-none text-white">
                                    Resume Studio
                                </h1>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                    Last updated today
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <Button variant="outline" className="hidden md:flex rounded-full px-6 font-bold text-xs bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300">
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
                <div className="lg:hidden flex border-b border-slate-800 bg-[#0F0F13] z-10">
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
                <div className="lg:hidden absolute bottom-0 left-0 w-full bg-[#16161D] border-t border-slate-800 p-4 flex items-center justify-between z-20">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Fixes</span>
                        <span className="text-sm font-black text-amber-500">2 Suggestions</span>
                    </div>
                    <Button onClick={() => setActiveTab("fixes")} className="bg-emerald-500 hover:bg-emerald-600 font-bold text-xs rounded-full">
                        Review Fixes
                    </Button>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .glass-panel {
          background: rgba(30,30,40,0.4);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.05);
          box-shadow: 0 8px 32px 0 rgba(0,0,0,0.3);
        }
        .thin-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .thin-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .thin-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        .thin-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
        .fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
        </EditorProvider>
    );
}
