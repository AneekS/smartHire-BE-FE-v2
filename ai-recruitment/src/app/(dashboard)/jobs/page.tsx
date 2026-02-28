"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  MapPin,
  Sparkles,
  ChevronDown,
  Zap,
  Cloud,
  Database,
  Shield,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useJobs } from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";

const iconMap: Record<string, typeof Cloud> = {
  cloud: Cloud,
  data: Database,
  security: Shield,
};

export default function JobsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParams, setSearchParams] = useState<{
    role?: string;
    location?: string;
    skills?: string;
    experience?: string;
  } | null>(null);
  const { jobs, isLoading, apply } = useJobs(searchParams || undefined);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const handleSearch = () => {
    setSearchParams({
      role: searchQuery || undefined,
    });
  };

  const handleApply = async (jobId: string) => {
    setApplyingId(jobId);
    try {
      await apply(jobId);
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8 flex gap-8">
      <aside className="w-72 flex-shrink-0 hidden lg:block">
        <div className="sticky top-24 space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
              Filters
            </h3>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search roles or skills"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10 rounded-xl"
              />
            </div>
            <Button
              className="w-full rounded-xl mb-6"
              onClick={handleSearch}
            >
              Search Jobs
            </Button>
          </div>
          <Card className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white border-0">
            <p className="text-xs font-medium opacity-80 mb-1">PRO FEATURE</p>
            <h4 className="font-bold mb-2 leading-tight">
              Mock Interview with AI Expert
            </h4>
            <p className="text-xs opacity-90 mb-4">
              Practice system design with our LLM-powered technical interviewer.
            </p>
            <Button
              asChild
              className="w-full py-2 bg-white text-indigo-600 text-xs font-bold rounded-lg hover:bg-slate-50"
            >
              <a href="/interviews">Start Prep</a>
            </Button>
          </Card>
        </div>
      </aside>
      <section className="flex-grow">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Recommended for You</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Based on your optimized resume and technical skills.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Sort by:</span>
            <button className="flex items-center gap-1 text-sm font-semibold">
              Best Match <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : jobs.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-slate-500">
              No jobs found. Try adjusting your search or check back later.
            </p>
            <Button className="mt-4" onClick={handleSearch} variant="outline">
              Search Jobs
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative group p-6 rounded-2xl border-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-600 flex-shrink-0">
                    <Cloud className="w-8 h-8 text-slate-400" />
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                          {job.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                            {job.company_name ?? "Company"}
                          </span>
                          <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                          <span className="flex items-center gap-1 text-sm text-slate-500">
                            <MapPin className="w-4 h-4" />
                            {job.city ?? job.state ?? (job.is_remote ? "Remote" : "—")}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {job.salary_min != null && (
                          <Badge variant="secondary" className="text-xs">
                            ₹{job.salary_min}L - ₹{job.salary_max ?? job.salary_min}L
                          </Badge>
                        )}
                      </div>
                    </div>
                    {(job.required_skills?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {job.required_skills?.slice(0, 5).map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-end mt-4">
                      <Button
                        className="rounded-full"
                        onClick={() => handleApply(job.id)}
                        disabled={applyingId === job.id}
                      >
                        {applyingId === job.id ? (
                          <>Applying...</>
                        ) : (
                          <>
                            Easy Apply <Zap className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group">
        <MessageCircle className="w-6 h-6" />
        <span className="absolute right-16 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Need help with your application?
        </span>
      </button>
    </div>
  );
}
