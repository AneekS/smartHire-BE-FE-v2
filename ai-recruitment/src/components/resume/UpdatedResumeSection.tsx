"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { diffWords } from "diff";
import { useResumeStore } from "@/store/useResumeStore";
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
                return <span key={i} className="text-gray-700">{part.value}</span>;
            })}
        </span>
    );
}

export function UpdatedResumeSection() {
    const { updatedContent: data, appliedFixes, changeLog, undoFix, undoAll } = useResumeStore();
    const [viewMode, setViewMode] = useState<"side-by-side" | "unified">("side-by-side");
    const [isDownloading, setIsDownloading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const hasChanges = appliedFixes.length > 0;

    const handleCopy = () => {
        if (!data) return;
        const text = `
${data.contactInfo.name}
${data.contactInfo.email} | ${data.contactInfo.location}

SUMMARY
${data.summary}

EXPERIENCE
${data.experience.map(e => `${e.title} at ${e.company}\n${e.startDate} - ${e.endDate}\n${e.bullets.map(b => `- ${b.text}`).join("\n")}`).join("\n\n")}

SKILLS
${data.skills.map(s => s.name).join(", ")}
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
                    <div className="relative flex flex-1 flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
                        {/* Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                            <div>
                                <h2 className="text-xl font-display font-black tracking-tight text-gray-900 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-emerald-400" />
                                    Updated Resume Preview
                                </h2>
                                <p className="text-sm text-emerald-500 font-medium tracking-wide mt-1">
                                    {appliedFixes.length} changes applied · Last updated just now
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button onClick={handleCopy} variant="outline" className="h-9 rounded-xl border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                                    {isCopied ? <Check className="w-3.5 h-3.5 mr-2 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-2" />}
                                    {isCopied ? "Copied!" : "Copy Text"}
                                </Button>
                                <Button disabled={isDownloading} onClick={handleDownload} className="h-9 rounded-xl bg-violet-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-violet-700">
                                    {isDownloading ? <Clock className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-2" />}
                                    Download PDF
                                </Button>
                                <Button onClick={undoAll} variant="ghost" className="h-9 rounded-xl px-4 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                                    <RefreshCcw className="w-3.5 h-3.5 mr-2" />
                                    Reset All
                                </Button>
                            </div>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="absolute right-6 top-6 mb-6 flex w-fit self-end rounded-2xl border border-gray-200 bg-gray-100 p-1 lg:static lg:self-start">
                            <Button
                                variant="ghost"
                                onClick={() => setViewMode("side-by-side")}
                                className={`h-8 rounded-xl px-4 text-xs font-semibold ${viewMode === "side-by-side" ? "bg-white text-violet-600 shadow-sm" : "text-gray-500"}`}
                            >
                                <Columns className="mr-2 h-3.5 w-3.5" />
                                Side by Side
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setViewMode("unified")}
                                className={`h-8 rounded-xl px-4 text-xs font-semibold ${viewMode === "unified" ? "bg-white text-violet-600 shadow-sm" : "text-gray-500"}`}
                            >
                                <AlignLeft className="w-3.5 h-3.5 mr-2" />
                                Unified Diff
                            </Button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-x-auto rounded-2xl border border-gray-100 bg-gray-50/50 p-6 thin-scrollbar lg:p-10">
                            {viewMode === "side-by-side" ? (
                                <div className="grid grid-cols-2 gap-8 min-w-[700px]">
                                    {/* Original Column */}
                                    <div className="space-y-6 opacity-60">
                                        <div className="sticky top-0 bg-white py-2 z-10 border-b border-gray-200 mb-4">
                                            <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">Original</span>
                                        </div>
                                        {appliedFixes.map(fix => (
                                            <div key={fix.id} className="p-4 border-l-2 border-red-500/30 bg-red-500/5 rounded-r-xl">
                                                <p className="text-xs font-bold text-red-400/60 mb-2 uppercase tracking-wider">{fix.section}</p>
                                                <p className="text-sm text-gray-400 line-through decoration-red-500/40">{fix.originalText}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Updated Column */}
                                    <div className="space-y-6">
                                        <div className="sticky top-0 bg-white py-2 z-10 border-b border-emerald-500/30 mb-4">
                                            <span className="text-xs font-bold tracking-widest text-emerald-500 uppercase flex items-center gap-2">
                                                <Sparkles className="w-3.5 h-3.5" /> Updated
                                            </span>
                                        </div>
                                        {appliedFixes.map((fix) => (
                                            <motion.div
                                                key={fix.id + "-updated"}
                                                initial={{ backgroundColor: 'rgba(16,185,129,0.3)' }}
                                                animate={{ backgroundColor: 'transparent' }}
                                                transition={{ duration: 1, delay: 0.1 }}
                                                className="p-4 border-l-2 border-emerald-500 bg-emerald-500/5 rounded-r-xl relative group"
                                            >
                                                <div className="absolute -top-3 left-4 flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                                                    <Sparkles className="h-3 w-3" /> AI Improved
                                                </div>
                                                <p className="text-xs font-bold text-emerald-500/60 mb-2 uppercase tracking-wider mt-2">{fix.section}</p>
                                                <p className="text-sm text-gray-700">
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
                                            <div className="absolute -top-3 left-4 flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                                                <Sparkles className="h-3 w-3" /> AI Improved
                                            </div>
                                            <div className="mt-3 text-sm text-gray-700 leading-relaxed font-medium">
                                                <HighlightedDiff original={fix.originalText} updated={fix.newText} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Change Log Sidebar */}
                    <div className="flex w-full flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm xl:w-80 xl:shrink-0">
                        <div className="mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-700">Change Log</h3>
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
                                        className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1">
                                                <Check className="w-3 h-3 text-emerald-500" />
                                                {timeAgo(log.timestamp)}
                                            </span>
                                            <button
                                                onClick={() => undoFix(log.fixId)}
                                                className="text-[10px] font-bold text-gray-500 hover:text-rose-400 uppercase tracking-widest transition-colors"
                                            >
                                                Undo
                                            </button>
                                        </div>
                                        <p className="text-xs font-bold text-gray-800 mb-1">{log.section}</p>
                                        <p className="text-xs text-gray-500">{log.description}</p>
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
