import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResumeStore } from "@/store/useResumeStore";
import { Button } from "@/components/ui/button";

export function FixItSuggestionsPanel() {
    const { improvements, applyFix, ignoreFix, applyAllFixes } = useResumeStore();

    const pendingSuggestions = improvements.filter(s => !s.applied);

    return (
        <div className="w-full h-full flex flex-col gap-6 max-h-[85vh] overflow-y-auto lg:pr-4 thin-scrollbar pb-24">
            <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-between sticky top-0 bg-[#F4F4F5]/80 backdrop-blur-md z-10 py-2 pt-4"
            >
                <h3 className="text-xl font-bold font-display text-slate-900">Fix-It Suggestions</h3>
                {pendingSuggestions.length > 0 && (
                    <Button
                        onClick={applyAllFixes}
                        className="rounded-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 text-xs font-bold transition-all shadow-none"
                    >
                        Apply All ({pendingSuggestions.length})
                    </Button>
                )}
            </motion.div>

            <div className="flex flex-col gap-4">
                <AnimatePresence>
                    {pendingSuggestions.map((suggestion, idx) => {
                        const isCritical = suggestion.severity === "critical";
                        const badgeColor = isCritical
                            ? "text-rose-500 border-rose-500/20 bg-rose-500/10"
                            : "text-amber-500 border-amber-500/20 bg-amber-500/10";

                        return (
                            <motion.div
                                key={suggestion.id}
                                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 100, height: 0, margin: 0, padding: 0 }}
                                transition={{ duration: 0.4, delay: idx * 0.1 }}
                                className="glass-panel p-5 rounded-3xl border border-slate-200 bg-white shadow-sm relative overflow-hidden"
                            >
                                <div className={cn("absolute top-0 left-0 w-1 h-full", isCritical ? "bg-rose-500" : "bg-amber-500")} />

                                <div className="flex justify-between items-start mb-3 pl-2">
                                    <div className="flex items-center gap-2">
                                        <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border", badgeColor)}>
                                            {isCritical ? "🔴 CRITICAL" : "⚠️ IMPROVEMENT"}
                                        </span>
                                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                                            • {suggestion.section}
                                        </span>
                                    </div>
                                    <button onClick={() => ignoreFix(suggestion.id)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                                        <X className="w-4 h-4 cursor-pointer" />
                                    </button>
                                </div>

                                <h4 className="font-bold text-slate-800 mb-4 pl-2 text-sm leading-tight">
                                    {suggestion.title}
                                </h4>

                                <div className="space-y-2 mb-4">
                                    <div className="px-3 py-2.5 rounded-xl bg-rose-50/50 border border-rose-100/50">
                                        <p className="text-[10px] uppercase font-bold text-rose-500/70 mb-1 tracking-wider">Before</p>
                                        <p className="text-sm font-medium text-slate-600 line-through decoration-rose-500/30 decoration-2">&quot;{suggestion.originalText}&quot;</p>
                                    </div>

                                    <div className="flex justify-center -my-3 relative z-10 w-full">
                                        <div className="bg-white p-1 rounded-full shadow-sm border border-slate-100">
                                            <div className="w-6 h-6 bg-slate-50 rounded-full flex items-center justify-center">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="m6 9 6 6 6-6" /></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-3 py-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100/50">
                                        <p className="text-[10px] uppercase font-bold text-emerald-500/70 mb-1 tracking-wider">After</p>
                                        <p className="text-sm font-medium text-slate-800">&quot;{suggestion.suggestedText}&quot;</p>
                                    </div>
                                </div>

                                <div className="flex gap-2 pl-2">
                                    <Button
                                        variant="ghost"
                                        className="flex-1 text-xs font-bold rounded-2xl hover:bg-slate-100 text-slate-600"
                                        onClick={() => ignoreFix(suggestion.id)}
                                    >
                                        Ignore
                                    </Button>
                                    <Button
                                        className="flex-[2] text-xs font-bold rounded-2xl bg-primary text-white hover:opacity-90 transition-opacity gap-2"
                                        onClick={() => applyFix(suggestion)}
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        Apply Fix
                                    </Button>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {pendingSuggestions.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center p-10 text-center glass-panel rounded-3xl"
                    >
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 mb-2">All Caught Up!</h4>
                        <p className="text-sm text-slate-500 max-w-[200px]">Your resume is looking great. No new suggestions to review.</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
