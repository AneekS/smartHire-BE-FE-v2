"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { diffWords } from "diff";
import { useEditor } from "./EditorContext";
import { Copy, Download, RefreshCcw, Sparkles, Check, Clock, Columns, AlignLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function HighlightedDiff({ original, updated }: { original: string; updated: string }) {
    const parts = diffWords(original, updated);

    return (
        <span className="whitespace-pre-wrap break-words">
            {parts.map((part, i) => {
                if (part.added) {
                    return (
                        <motion.mark
                            key={i}
                            initial={{ backgroundColor: "rgba(16,185,129,0.5)" }}
                            animate={{ backgroundColor: "rgba(16,185,129,0.15)" }}
                            transition={{ duration: 0.6 }}
                            className="text-emerald-400 font-medium rounded px-0.5 relative group inline-flex items-center"
                        >
                            <Sparkles className="w-3 h-3 text-emerald-500 mr-0.5 inline" />
                            {part.value}
                        </motion.mark>
                    );
                }
                if (part.removed) {
                    return (
                        <span key={i} className="text-red-400/60 line-through decoration-red-500">
                            {part.value}
                        </span>
                    );
                }
                return <span key={i} className="text-slate-300">{part.value}</span>;
            })}
        </span>
    );
}

export function UpdatedResumeSection() {
    const { originalData, data, appliedFixes, changeLog, undoFix, undoAll } = useEditor();
    const [viewMode, setViewMode] = useState<"side-by-side" | "unified">("side-by-side");
    const [isDownloading, setIsDownloading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const hasChanges = appliedFixes.length > 0;

    const handleCopy = () => {
        const text = `
${data.contact.name}
${data.contact.email} | ${data.contact.location}

SUMMARY
${data.summary}

EXPERIENCE
${data.experience.map(e => `${e.title} at ${e.company}\n${e.date}\n${e.bullets.map(b => `- ${b}`).join("\n")}`).join("\n\n")}

SKILLS
${data.skills.join(", ")}
        `.trim();
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        toast.success("Copied to clipboard!");
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        // Simulate API call to generate PDF
        await new Promise(r => setTimeout(r, 1500));
        setIsDownloading(false);
        toast.success("Downloaded Resume_Updated.pdf");
    };

    const timeAgo = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return `${seconds} secs ago`;
        return `${Math.floor(seconds / 60)} mins ago`;
    };

    return (
        <AnimatePresence>
            {hasChanges && (
                <motion.div
                    initial={{ opacity: 0, y: 50, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: 50, height: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="w-full mt-6 flex flex-col xl:flex-row gap-6 pb-20 overflow-hidden"
                >
                    {/* Main Updated Area */}
                    <div className="flex-1 glass-panel rounded-3xl p-6 lg:p-8 border border-white/5 flex flex-col relative">
                        {/* Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                            <div>
                                <h2 className="text-xl font-display font-black tracking-tight text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-emerald-400" />
                                    Updated Resume Preview
                                </h2>
                                <p className="text-sm text-emerald-500 font-medium tracking-wide mt-1">
                                    {appliedFixes.length} changes applied · Last updated just now
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button onClick={handleCopy} variant="outline" className="h-9 px-4 text-xs font-bold rounded-xl border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-300">
                                    {isCopied ? <Check className="w-3.5 h-3.5 mr-2 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-2" />}
                                    {isCopied ? "Copied!" : "Copy Text"}
                                </Button>
                                <Button disabled={isDownloading} onClick={handleDownload} className="h-9 px-4 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90">
                                    {isDownloading ? <Clock className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-2" />}
                                    Download PDF
                                </Button>
                                <Button onClick={undoAll} variant="ghost" className="h-9 px-4 text-xs font-bold rounded-xl hover:bg-rose-500/10 text-rose-400 hover:text-rose-500">
                                    <RefreshCcw className="w-3.5 h-3.5 mr-2" />
                                    Reset All
                                </Button>
                            </div>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex bg-slate-900/50 p-1 rounded-2xl w-fit mb-6 border border-slate-800 self-end absolute top-6 right-6 lg:static lg:self-start">
                            <Button
                                variant="ghost"
                                onClick={() => setViewMode("side-by-side")}
                                className={`h-8 px-4 text-xs font-bold rounded-xl ${viewMode === 'side-by-side' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500'}`}
                            >
                                <Columns className="w-3.5 h-3.5 mr-2" />
                                Side by Side
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setViewMode("unified")}
                                className={`h-8 px-4 text-xs font-bold rounded-xl ${viewMode === 'unified' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500'}`}
                            >
                                <AlignLeft className="w-3.5 h-3.5 mr-2" />
                                Unified Diff
                            </Button>
                        </div>

                        {/* Content Area */}
                        <div className="bg-[#0B0B0F] border border-slate-800/50 rounded-2xl p-6 lg:p-10 flex-1 overflow-x-auto thin-scrollbar">
                            {viewMode === "side-by-side" ? (
                                <div className="grid grid-cols-2 gap-8 min-w-[700px]">
                                    {/* Original Column */}
                                    <div className="space-y-6 opacity-60">
                                        <div className="sticky top-0 bg-[#0B0B0F] py-2 z-10 border-b border-slate-800 mb-4">
                                            <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">Original</span>
                                        </div>
                                        {appliedFixes.map(fix => (
                                            <div key={fix.id} className="p-4 border-l-2 border-red-500/30 bg-red-500/5 rounded-r-xl">
                                                <p className="text-xs font-bold text-red-400/60 mb-2 uppercase tracking-wider">{fix.section}</p>
                                                <p className="text-sm text-slate-400 line-through decoration-red-500/40">{fix.originalText}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Updated Column */}
                                    <div className="space-y-6">
                                        <div className="sticky top-0 bg-[#0B0B0F] py-2 z-10 border-b border-emerald-900/30 mb-4">
                                            <span className="text-xs font-bold tracking-widest text-emerald-500 uppercase flex items-center gap-2">
                                                <Sparkles className="w-3.5 h-3.5" /> Updated
                                            </span>
                                        </div>
                                        {appliedFixes.map((fix, i) => (
                                            <motion.div
                                                key={fix.id + "-updated"}
                                                initial={{ backgroundColor: 'rgba(16,185,129,0.3)' }}
                                                animate={{ backgroundColor: 'transparent' }}
                                                transition={{ duration: 1, delay: 0.1 }}
                                                className="p-4 border-l-2 border-emerald-500 bg-emerald-500/5 rounded-r-xl relative group"
                                            >
                                                <div className="absolute -top-3 left-4 bg-emerald-500 text-[#0F0F13] text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <Sparkles className="w-3 h-3" /> AI Improved
                                                </div>
                                                <p className="text-xs font-bold text-emerald-500/60 mb-2 uppercase tracking-wider mt-2">{fix.section}</p>
                                                <p className="text-sm text-slate-200">
                                                    <HighlightedDiff original={fix.originalText} updated={fix.newText} />
                                                </p>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="max-w-3xl mx-auto space-y-8">
                                    {appliedFixes.map(fix => (
                                        <div key={fix.id} className="p-5 border border-emerald-500/20 bg-emerald-500/5 rounded-2xl relative">
                                            <div className="absolute -top-3 left-4 bg-emerald-500 text-[#0F0F13] text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                                                <Sparkles className="w-3 h-3" /> AI Improved
                                            </div>
                                            <div className="mt-3 text-sm text-slate-300 leading-relaxed font-medium">
                                                <HighlightedDiff original={fix.originalText} updated={fix.newText} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Change Log Sidebar */}
                    <div className="w-full xl:w-80 glass-panel rounded-3xl p-6 border border-white/5 flex flex-col xl:shrink-0">
                        <div className="flex items-center gap-2 mb-6 border-b border-slate-800/50 pb-4">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300">Change Log</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto thin-scrollbar space-y-4 pr-2">
                            <AnimatePresence>
                                {changeLog.map((log) => (
                                    <motion.div
                                        key={log.id}
                                        initial={{ opacity: 0, x: 20, height: 0 }}
                                        animate={{ opacity: 1, x: 0, height: "auto" }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.3 }}
                                        className="bg-[#0B0B0F]/80 border border-slate-800 rounded-2xl p-4"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                                                <Check className="w-3 h-3 text-emerald-500" />
                                                {timeAgo(log.timestamp)}
                                            </span>
                                            <button
                                                onClick={() => undoFix(log.fixId)}
                                                className="text-[10px] font-bold text-slate-500 hover:text-rose-400 uppercase tracking-widest transition-colors"
                                            >
                                                Undo
                                            </button>
                                        </div>
                                        <p className="text-xs font-bold text-slate-300 mb-1">{log.section}</p>
                                        <p className="text-xs text-slate-500">{log.description}</p>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
