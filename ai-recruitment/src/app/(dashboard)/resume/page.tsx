"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useResumes } from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";

type SuggestionType = "CRITICAL" | "IMPROVEMENT" | "OPTIMIZATION";

const suggestionConfig: Record<
  SuggestionType,
  { label: string; icon: typeof AlertCircle; className: string }
> = {
  CRITICAL: {
    label: "Critical Fix",
    icon: AlertCircle,
    className: "text-rose-500 bg-rose-500/10",
  },
  IMPROVEMENT: {
    label: "Improvement",
    icon: AlertTriangle,
    className: "text-amber-500 bg-amber-500/10",
  },
  OPTIMIZATION: {
    label: "Optimization",
    icon: CheckCircle2,
    className: "text-emerald-500 bg-emerald-500/10",
  },
};

export default function ResumePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { resumes, isLoading, uploadResume } = useResumes();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("fix-it");

  const selected = resumes.find((v) => v.id === selectedId) ?? resumes[0];
  const score = selected?.atsScore ?? 74;
  const suggestions = selected?.suggestions ?? [];
  const criticalCount = suggestions.filter((s) => s.type === "CRITICAL").length;
  const improvementCount = suggestions.filter((s) => s.type === "IMPROVEMENT").length;
  const optimizedCount = suggestions.filter((s) => s.type === "OPTIMIZATION").length;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadResume(file);
      setSelectedId(null);
    }
    e.target.value = "";
  };

  return (
    <div className="flex h-full flex-col bg-slate-50/50 dark:bg-slate-950/50">
      <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-100 bg-white/70 px-6 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-display text-xl font-bold">SmartHire</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Career Intelligence
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-3 rounded-full border border-slate-100 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-800/50 lg:flex">
            <FileText className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {selected?.title ?? "Upload your resume"}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            size="sm"
            className="rounded-2xl bg-slate-900 px-6 py-3.5 text-xs font-bold shadow-xl dark:bg-white dark:text-slate-900"
            onClick={() => fileInputRef.current?.click()}
          >
            <Download className="mr-2 h-4 w-4" />
            Upload Resume
          </Button>
          <Button
            size="sm"
            className="rounded-2xl bg-slate-900 px-6 py-3.5 text-xs font-bold shadow-xl dark:bg-white dark:text-slate-900"
            onClick={() => window.print()}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <section className="flex w-1/2 flex-col overflow-y-auto border-r border-slate-100 bg-slate-50/50 p-8 dark:border-slate-800 dark:bg-slate-950/30">
          <div className="mx-auto w-full max-w-[650px] rounded-2xl border border-slate-100 bg-white p-12 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] dark:border-slate-800 dark:bg-slate-900">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : resumes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-slate-500">
                  Upload your resume to get AI-powered analysis and ATS score.
                </p>
                <Button
                  className="mt-6 rounded-2xl bg-primary shadow-lg shadow-primary/20"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Upload Resume
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="text-center">
                  <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
                    Resume Preview
                  </h1>
                  <p className="mt-3 text-[11px] font-medium uppercase tracking-widest text-slate-400">
                    {selected?.title}
                  </p>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  Your resume has been analyzed. View suggestions on the right.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="relative flex w-1/2 flex-col bg-white dark:bg-slate-900">
          <div className="border-b border-slate-50 p-8 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div className="relative flex h-28 w-28 items-center justify-center">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 112 112">
                    <circle
                      className="text-slate-100 dark:text-slate-800"
                      cx="56"
                      cy="56"
                      r="50"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="10"
                    />
                    <circle
                      className={cn(
                        "transition-[stroke-dashoffset] duration-1000",
                        score >= 76 ? "text-emerald-500" : score >= 51 ? "text-amber-500" : "text-rose-500"
                      )}
                      cx="56"
                      cy="56"
                      r="50"
                      fill="transparent"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="10"
                      strokeDasharray={283}
                      strokeDashoffset={283 - (283 * score) / 100}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">
                      {score}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                      ATS Score
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="font-display text-3xl font-bold leading-tight text-slate-900 dark:text-white">
                    Nice work!
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Ready for{" "}
                    <Badge className="rounded-full bg-primary/10 px-2 py-0.5 font-bold text-primary">
                      SDE Roles
                    </Badge>{" "}
                    in India
                  </p>
                  <div className="mt-4 flex gap-4">
                    <span className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-600 dark:bg-emerald-900/30">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Contact Valid
                    </span>
                    <span className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-600 dark:bg-amber-900/30">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {suggestions.length} Suggestions
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="border-b border-slate-100 px-8 pt-6 dark:border-slate-800">
              <TabsList className="h-auto gap-8 rounded-none border-0 bg-transparent p-0">
                <TabsTrigger
                  value="fix-it"
                  className="border-b-2 border-primary pb-5 font-display text-sm font-bold text-primary data-[state=inactive]:border-transparent data-[state=inactive]:text-slate-400"
                >
                  Fix-It Suggestions
                </TabsTrigger>
                <TabsTrigger
                  value="keywords"
                  className="border-b-2 border-transparent pb-5 font-display text-sm font-bold text-slate-400"
                >
                  Keyword Match
                </TabsTrigger>
                <TabsTrigger
                  value="rewrite"
                  className="border-b-2 border-transparent pb-5 font-display text-sm font-bold text-slate-400"
                >
                  Rewrite Assistant
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <TabsContent value="fix-it" className="mt-0 space-y-6">
                {isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : suggestions.length === 0 ? (
                  <Card className="rounded-3xl border-slate-100 p-8 dark:border-slate-800">
                    <p className="mb-4 text-slate-500">
                      Upload a resume to get tailored AI suggestions.
                    </p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-2xl bg-primary shadow-lg shadow-primary/20"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Upload Resume
                    </Button>
                  </Card>
                ) : (
                  suggestions.map((s) => {
                    const config = suggestionConfig[s.type as SuggestionType] ?? suggestionConfig.IMPROVEMENT;
                    return (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900/50"
                      >
                        <div className="mb-5 flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className={cn("text-[11px] font-bold uppercase tracking-widest", config.className)}>
                              {config.label}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
                            {s.section}
                          </span>
                        </div>
                        <h4 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-3">
                          {s.title}
                        </h4>
                        <p className="mb-6 text-[14px] leading-relaxed text-slate-500">
                          {s.description}
                        </p>
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            className="flex-1 rounded-2xl bg-slate-50 text-xs font-bold dark:bg-slate-800"
                          >
                            Ignore
                          </Button>
                          <Button className="flex-[2] rounded-2xl bg-primary text-xs font-bold shadow-lg shadow-primary/20">
                            <Sparkles className="mr-2 h-4 w-4" />
                            Auto-Fix with AI
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </TabsContent>
              <TabsContent value="keywords" className="mt-0">
                <Card className="rounded-3xl border-slate-100 p-8 dark:border-slate-800">
                  <p className="text-slate-500">
                    Keyword match analysis for job-specific optimization.
                  </p>
                </Card>
              </TabsContent>
              <TabsContent value="rewrite" className="mt-0">
                <Card className="rounded-3xl border-slate-100 p-8 dark:border-slate-800">
                  <p className="text-slate-500">
                    Use the rewrite assistant to improve bullet points.
                  </p>
                </Card>
              </TabsContent>
            </div>
          </Tabs>

          <footer className="flex h-14 shrink-0 items-center justify-between border-t border-slate-100 bg-white px-8 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex gap-8">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                {criticalCount} Critical
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                {improvementCount} Improvements
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {optimizedCount} Optimized
              </div>
            </div>
            <span className="flex items-center gap-1.5 rounded bg-emerald-50 px-2 text-emerald-500 text-[10px] dark:bg-emerald-900/30">
              <CheckCircle2 className="h-3 w-3" />
              Auto-Saved
            </span>
          </footer>
        </section>
      </main>
    </div>
  );
}
