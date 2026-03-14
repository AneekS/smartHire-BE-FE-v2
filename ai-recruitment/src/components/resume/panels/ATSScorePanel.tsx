import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, CheckCircle2, ShieldAlert, FileText, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResumeStore } from "@/store/useResumeStore";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const SECTION_TO_ID: Record<string, string> = {
    EXPERIENCE: "experience",
    SKILLS: "skills",
    EDUCATION: "education",
    SUMMARY: "summary",
    PROJECTS: "projects",
};

export function ATSScorePanel({ onViewSection }: { onViewSection?: (sectionId: string) => void }) {
    const { atsScore, scoreBreakdown, improvements, uploadedAt, fileName, deleteResume, replaceResume } = useResumeStore();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
    const [pendingReplaceFile, setPendingReplaceFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToSection = (sectionId: string) => {
        const el = document.getElementById(`resume-section-${sectionId}`);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
        el?.classList.add("section-highlight");
        setTimeout(() => el?.classList.remove("section-highlight"), 2000);
        onViewSection?.(sectionId);
    };
    const [displayedScore, setDisplayedScore] = useState(0);

    const safeScore = atsScore || 0;

    // Animated score counter
    useEffect(() => {
        let start = 0;
        const end = parseInt(safeScore.toString(), 10);
        if (start === end) return;

        const timer = setInterval(() => {
            start += 3;
            if (start > end) {
                start = end;
                clearInterval(timer);
            }
            setDisplayedScore(start);
        }, 30);
        return () => clearInterval(timer);
    }, [safeScore]);

    const getColorClass = (score: number) => {
        if (score < 50) return "text-rose-500";
        if (score < 75) return "text-amber-600";
        if (score < 90) return "text-violet-600";
        return "text-emerald-600";
    };

    const getRingColor = (score: number) => {
        if (score < 50) return "stroke-rose-400";
        if (score < 75) return "stroke-amber-400";
        if (score < 90) return "stroke-violet-400";
        return "stroke-emerald-400";
    };

    const getBarBg = (score: number) => {
        if (score >= 80) return "bg-emerald-500";
        if (score >= 60) return "bg-amber-500";
        if (score >= 40) return "bg-violet-500";
        return "bg-rose-400";
    };

    const breakdowns = [
        { label: "Keyword Match", val: scoreBreakdown?.keywordMatch || 0, target: 100 },
        { label: "Formatting", val: scoreBreakdown?.formatting || 0, target: 100 },
        { label: "Experience Match", val: scoreBreakdown?.experienceMatch || 0, target: 100 },
        { label: "Skills Alignment", val: scoreBreakdown?.skillsAlignment || 0, target: 100 }
    ];

    const timeAgo = (dateStr: string | null) => {
        if (!dateStr) return null;
        try {
            const date = new Date(dateStr);
            if (Number.isNaN(date.getTime())) return null;
            return formatDistanceToNow(date, { addSuffix: true });
        } catch {
            return null;
        }
    };

    return (
        <div className="flex h-full w-full flex-col gap-6">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
            >
                <div className="flex flex-col items-center">
                    <div className="relative flex items-center justify-center w-40 h-40 mb-2">
                        <svg className="absolute w-full h-full transform -rotate-90">
                            <circle
                                className="stroke-gray-200"
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
                            {atsScore === null ? (
                                <span className="text-3xl font-bold tracking-tighter text-gray-400">--</span>
                            ) : (
                                <span className={cn("text-5xl font-black tracking-tighter", getColorClass(displayedScore))}>
                                    {displayedScore}
                                </span>
                            )}
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Score</span>
                        </div>
                    </div>
                    <p className="mt-2 text-sm font-medium text-gray-500">
                        {atsScore === null ? "Waiting for upload..." : timeAgo(uploadedAt) ? `Last analyzed ${timeAgo(uploadedAt)}` : "Just now"}
                    </p>
                </div>

                {/* File info + Replace / Delete */}
                {(fileName || uploadedAt) && (
                    <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                        <div className="flex items-center gap-2 text-gray-700">
                            <FileText className="h-4 w-4 shrink-0 text-gray-500" />
                            <span className="truncate text-sm font-medium">{fileName ?? "Resume"}</span>
                        </div>
                        {uploadedAt && (
                            <p className="mt-1 text-xs text-gray-500">Uploaded {timeAgo(uploadedAt)}</p>
                        )}
                        <div className="mt-3 flex gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.doc,.docx"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setPendingReplaceFile(file);
                                        setReplaceDialogOpen(true);
                                    }
                                    e.target.value = "";
                                }}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 flex-1 rounded-lg border-gray-200 text-xs text-gray-700 hover:bg-gray-50"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                                Replace
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 flex-1 text-xs rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => setDeleteDialogOpen(true)}
                            >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                Delete
                            </Button>
                        </div>
                    </div>
                )}

                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent className="rounded-2xl">
                        <DialogHeader>
                            <DialogTitle>Delete Resume?</DialogTitle>
                            <DialogDescription>
                                This will permanently delete your resume, ATS scores, and all AI suggestions. This cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={async () => {
                                    await deleteResume();
                                    setDeleteDialogOpen(false);
                                }}
                            >
                                Delete Permanently
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={replaceDialogOpen} onOpenChange={(open) => { if (!open) setPendingReplaceFile(null); setReplaceDialogOpen(open); }}>
                    <DialogContent className="rounded-2xl">
                        <DialogHeader>
                            <DialogTitle>Replace current resume?</DialogTitle>
                            <DialogDescription>
                                Replace with {pendingReplaceFile?.name ?? "new file"}? Your current ATS scores and suggestions will be reset.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => { setReplaceDialogOpen(false); setPendingReplaceFile(null); }}>
                                Cancel
                            </Button>
                            <Button
                                onClick={async () => {
                                    if (pendingReplaceFile) await replaceResume(pendingReplaceFile);
                                    setReplaceDialogOpen(false);
                                    setPendingReplaceFile(null);
                                }}
                            >
                                Yes, Replace
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <div className="mt-8 space-y-4">
                    {breakdowns.map((b, i) => (
                        <motion.div
                            key={b.label}
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "100%" }}
                            transition={{ delay: 0.5 + i * 0.08, duration: 0.5 }}
                            className="space-y-1.5"
                        >
                            <div className="flex justify-between text-xs font-semibold text-gray-600">
                                <span>{b.label}</span>
                                <span className={getColorClass(b.val)}>{b.val}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${b.val}%` }}
                                    transition={{ delay: 0.6 + i * 0.08, duration: 0.6 }}
                                    className={cn("h-full rounded-full", getBarBg(b.val))}
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="flex flex-col gap-3"
            >
                <h3 className="ml-1 text-xs font-bold uppercase tracking-widest text-gray-500">Section Analysis</h3>

                {["EXPERIENCE", "SKILLS", "EDUCATION", "SUMMARY", "PROJECTS"].map((sec, i) => {
                    const secSuggestions = improvements.filter(s => s.section.toUpperCase() === sec && !s.applied);
                    const hasIssues = secSuggestions.length > 0;
                    const isCritical = secSuggestions.some(s => s.severity === "critical");

                    let icon = <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
                    let statusText = "Optimized";
                    let statusClass = "rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 border-0";
                    let feedbackText = "Looks fully optimized";

                    if (hasIssues) {
                        icon = isCritical ? <ShieldAlert className="h-5 w-5 text-rose-500" /> : <AlertTriangle className="h-5 w-5 text-amber-500" />;
                        statusText = isCritical ? "Critical Fix" : "Needs Work";
                        statusClass = isCritical
                            ? "rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 border-0"
                            : "rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 border-0";
                        feedbackText = `${secSuggestions.length} item${secSuggestions.length === 1 ? "" : "s"} to fix`;
                    }

                    if (atsScore === null) {
                        statusText = "Pending";
                        statusClass = "rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 border-0";
                        feedbackText = "Waiting for analysis";
                        icon = <span className="h-5 w-5 rounded-full border-2 border-gray-300 animate-pulse border-t-gray-400" />;
                    }

                    const sectionId = SECTION_TO_ID[sec] ?? sec.toLowerCase();
                    return (
                        <motion.div
                            key={sec}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + i * 0.06, duration: 0.35 }}
                            className={cn(
                                "flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md",
                                isCritical && "border-l-4 border-l-rose-400",
                                hasIssues && !isCritical && "border-l-4 border-l-amber-400"
                            )}
                            onClick={() => hasIssues && scrollToSection(sectionId)}
                            onKeyDown={(e) => hasIssues && (e.key === "Enter" || e.key === " ") && scrollToSection(sectionId)}
                            role={hasIssues ? "button" : undefined}
                            tabIndex={hasIssues ? 0 : undefined}
                        >
                            <div className="mt-0.5 shrink-0">{icon}</div>
                            <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-center justify-between gap-2">
                                    <h4 className="text-sm font-bold tracking-wide text-gray-900">{sec}</h4>
                                    <span className={cn("shrink-0", statusClass)}>{statusText}</span>
                                </div>
                                <p className="text-xs leading-snug text-gray-500">
                                    {feedbackText} {hasIssues && <span className="font-semibold text-rose-500">View →</span>}
                                </p>
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>
        </div>
    );
}
