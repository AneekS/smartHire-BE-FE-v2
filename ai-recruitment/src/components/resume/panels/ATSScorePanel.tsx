import { motion } from "framer-motion";
import { Sparkles, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditor } from "../EditorContext";
import { useEffect, useState } from "react";

export function ATSScorePanel() {
    const { atsScore, suggestions } = useEditor();
    const [displayedScore, setDisplayedScore] = useState(0);

    // Animated score counter
    useEffect(() => {
        let start = 0;
        const end = parseInt(atsScore.toString(), 10);
        if (start === end) return;

        let timer = setInterval(() => {
            start += 3;
            if (start > end) {
                start = end;
                clearInterval(timer);
            }
            setDisplayedScore(start);
        }, 30);
        return () => clearInterval(timer);
    }, [atsScore]);

    const getColorClass = (score: number) => {
        if (score < 50) return "text-rose-500";
        if (score < 75) return "text-amber-500";
        if (score < 90) return "text-indigo-500";
        return "text-emerald-500";
    };

    const getRingColor = (score: number) => {
        if (score < 50) return "stroke-rose-500/80";
        if (score < 75) return "stroke-amber-400";
        if (score < 90) return "stroke-indigo-500/80";
        return "stroke-emerald-400";
    };

    const getPercentageString = (val: number, max: number) => (val / max) * 100 + "%";

    const breakdowns = [
        { label: "Keyword Match", val: 82, target: 100 },
        { label: "Formatting", val: 71, target: 100 },
        { label: "Experience Match", val: 90, target: 100 },
        { label: "Skills Alignment", val: 65, target: 100 }
    ];

    return (
        <div className="w-full h-full flex flex-col gap-6">
            <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="glass-panel p-6 rounded-3xl"
            >
                <div className="flex flex-col items-center">
                    <div className="relative flex items-center justify-center w-40 h-40 mb-2">
                        <svg className="absolute w-full h-full transform -rotate-90">
                            <circle
                                className="stroke-slate-200 dark:stroke-slate-800"
                                fill="transparent"
                                strokeWidth="12"
                                r="70"
                                cx="80"
                                cy="80"
                                strokeLinecap="round"
                            />
                            <motion.circle
                                className={getRingColor(displayedScore)}
                                fill="transparent"
                                strokeWidth="12"
                                strokeDasharray="440"
                                strokeDashoffset={440 - (440 * displayedScore) / 100}
                                r="70"
                                cx="80"
                                cy="80"
                                strokeLinecap="round"
                                initial={{ strokeDashoffset: 440 }}
                                animate={{ strokeDashoffset: 440 - (440 * displayedScore) / 100 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center text-center">
                            <span className={cn("text-5xl font-black tracking-tighter", getColorClass(displayedScore))}>
                                {displayedScore}
                            </span>
                            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Score</span>
                        </div>
                    </div>
                    <p className="text-sm font-medium text-slate-500 mt-2">Last analyzed: 2 mins ago</p>
                </div>

                <div className="mt-8 space-y-4">
                    {breakdowns.map((b, i) => (
                        <motion.div
                            key={b.label}
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "100%" }}
                            transition={{ delay: 0.7 + (i * 0.1), duration: 0.6 }}
                            className="space-y-1"
                        >
                            <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                                <span>{b.label}</span>
                                <span>{b.val}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${b.val}%` }}
                                    transition={{ delay: 0.8 + (i * 0.1), duration: 0.8 }}
                                    className={cn("h-full rounded-full", getColorClass(b.val).replace('text-', 'bg-'))}
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="flex flex-col gap-3"
            >
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 ml-2">Section Analysis</h3>

                {["EXPERIENCE", "SKILLS", "EDUCATION", "SUMMARY"].map((sec, i) => {
                    const secSuggestions = suggestions.filter(s => s.section.toUpperCase() === sec && !s.applied);
                    const hasIssues = secSuggestions.length > 0;
                    const isCritical = secSuggestions.some(s => s.type === "CRITICAL");

                    let icon = <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
                    let statusText = "Optimized";
                    let statusClass = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";

                    if (hasIssues) {
                        icon = isCritical ? <ShieldAlert className="w-5 h-5 text-rose-500" /> : <AlertTriangle className="w-5 h-5 text-amber-500" />;
                        statusText = isCritical ? "Critical Fix" : "Needs Work";
                        statusClass = isCritical ? "text-rose-500 bg-rose-500/10 border-rose-500/20" : "text-amber-500 bg-amber-500/10 border-amber-500/20";
                    }

                    return (
                        <motion.div
                            key={sec}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + (i * 0.1) }}
                            className="glass-panel p-4 rounded-2xl flex items-start gap-3 cursor-pointer hover:scale-[1.02] transition-transform"
                        >
                            <div className="mt-0.5">{icon}</div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="font-bold text-sm tracking-wide dark:text-slate-200">{sec}</h4>
                                    <span className={cn("text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border", statusClass)}>
                                        {statusText}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium">
                                    {hasIssues ? secSuggestions[0].title + " ⚠️" : "Looks fully optimized ✅"}
                                </p>
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>
        </div>
    );
}
