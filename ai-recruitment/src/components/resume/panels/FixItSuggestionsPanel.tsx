import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResumeStore } from "@/store/useResumeStore";
import { Button } from "@/components/ui/button";

export function FixItSuggestionsPanel() {
    const { improvements, applyFix, ignoreFix, applyAllFixes } = useResumeStore();

    const pendingSuggestions = improvements.filter(s => !s.applied);

    return (
        <div className="flex h-full max-h-[calc(100vh-8rem)] w-full flex-col overflow-hidden">
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="z-10 flex shrink-0 items-center justify-between border-b border-gray-100 bg-white py-3 pr-2 shadow-sm"
            >
                <h3 className="text-lg font-bold text-gray-900">Fix-It Suggestions</h3>
                {pendingSuggestions.length > 0 && (
                    <Button
                        onClick={applyAllFixes}
                        className="rounded-full bg-violet-600 text-xs font-semibold text-white shadow-sm hover:bg-violet-700"
                    >
                        Apply All ({pendingSuggestions.length})
                    </Button>
                )}
            </motion.div>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto thin-scrollbar py-4 pr-2">
                <AnimatePresence>
                    {pendingSuggestions.map((suggestion, idx) => {
                        const isCritical = suggestion.severity === "critical";
                        const badgeClass = isCritical
                            ? "rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 border-0"
                            : "rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 border-0";

                        return (
                            <motion.div
                                key={suggestion.id}
                                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, height: 0, margin: 0, padding: 0 }}
                                transition={{ duration: 0.35, delay: idx * 0.06 }}
                                className={cn(
                                    "relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm",
                                    isCritical ? "border-l-4 border-l-rose-400" : "border-l-4 border-l-amber-400"
                                )}
                            >

                                <div className="mb-3 flex items-start justify-between">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={badgeClass}>
                                            {isCritical ? "Critical" : "Improvement"}
                                        </span>
                                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                                            {suggestion.section}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => ignoreFix(suggestion.id)}
                                        className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <h4 className="mb-4 text-sm font-bold leading-tight text-gray-900">
                                    {suggestion.title}
                                </h4>

                                <div className="mb-4 space-y-2">
                                    <div className="rounded-xl border border-red-100 bg-red-50/80 px-3 py-2.5">
                                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-red-500/80">Before</p>
                                        <p className="text-sm font-medium text-gray-600 line-through decoration-red-300 decoration-2">&quot;{suggestion.originalText}&quot;</p>
                                    </div>
                                    <div className="flex justify-center">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="m6 9 6 6 6-6" /></svg>
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2.5">
                                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600/80">After</p>
                                        <p className="text-sm font-medium text-gray-800">&quot;{suggestion.suggestedText}&quot;</p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        className="flex-1 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                                        onClick={() => ignoreFix(suggestion.id)}
                                    >
                                        Ignore
                                    </Button>
                                    <Button
                                        className="flex-[2] gap-2 rounded-xl bg-violet-600 text-xs font-semibold text-white shadow-sm hover:bg-violet-700"
                                        onClick={() => applyFix(suggestion)}
                                    >
                                        <Sparkles className="h-3.5 w-3.5" />
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
                        className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm"
                    >
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                        </div>
                        <h4 className="mb-2 text-lg font-bold text-gray-900">All Caught Up!</h4>
                        <p className="max-w-[200px] text-sm text-gray-500">Your resume is looking great. No new suggestions to review.</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
