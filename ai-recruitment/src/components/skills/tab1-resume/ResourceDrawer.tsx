"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSkillGapStore } from "@/store/useSkillGapStore";
import { ArrowLeft } from "lucide-react";

interface Resource {
  type: "video" | "docs" | "course" | "article";
  title: string;
  url: string;
  duration: string;
  free: boolean;
}

interface PracticeProject {
  title: string;
  description: string;
  difficulty: string;
}

interface ResourcePayload {
  skill: string;
  estimatedTime: string;
  difficulty: string;
  resources: Resource[];
  practiceProjects: PracticeProject[];
}

export function ResourceDrawer() {
  const activeSkill = useSkillGapStore((s) => s.activeSkillDrawer);
  const close = useSkillGapStore((s) => s.closeResourceDrawer);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ResourcePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeSkill) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchResources = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/v1/skills/resources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            skill: activeSkill,
            currentLevel: "intermediate",
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          if (!cancelled) {
            setError((json.error as string) ?? "Failed to load resources");
            setLoading(false);
          }
          return;
        }
        if (!cancelled) {
          setData(json as ResourcePayload);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError("Failed to load resources");
          setLoading(false);
        }
      }
    };

    fetchResources();
    return () => {
      cancelled = true;
    };
  }, [activeSkill]);

  const open = !!activeSkill;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent
        side="right"
        className="w-full border-l border-gray-200 bg-white sm:max-w-[420px]"
      >
        <SheetHeader>
          <button
            type="button"
            onClick={close}
            className="absolute left-4 top-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <SheetTitle className="mt-8 text-base font-bold text-gray-900">
            Learning Resources
          </SheetTitle>
          <p className="text-sm font-medium text-violet-600">{activeSkill}</p>
          <SheetDescription className="text-xs text-gray-500">
            Curated videos, docs, and courses. Estimated timelines assume 2 hours per day.
          </SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-5 w-40 rounded-lg bg-gray-100" />
            <Skeleton className="h-20 w-full rounded-xl bg-gray-100" />
            <Skeleton className="h-20 w-full rounded-xl bg-gray-100" />
          </div>
        )}

        {!loading && error && (
          <p className="mt-4 text-sm text-red-500">{error}</p>
        )}

        {!loading && data && (
          <div className="mt-4 space-y-4 overflow-y-auto pr-1">
            <div className="flex items-center gap-2">
              <Badge className="rounded-full bg-amber-100 text-amber-700 border-0">
                Difficulty: {data.difficulty}
              </Badge>
              <Badge className="rounded-full bg-violet-100 text-violet-700 border-0">
                ⏱ {data.estimatedTime}
              </Badge>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Curated resources
              </p>
              {data.resources.map((r, i) => (
                <motion.a
                  key={r.url ? `${r.url}-${i}` : `resource-${i}`}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.01 }}
                  className="block rounded-xl border border-gray-100 bg-gray-50/80 p-3 transition-shadow hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800">{r.title}</p>
                    <Badge variant="outline" className="shrink-0 rounded-full border-gray-200 text-[10px] text-gray-600">
                      {r.type}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {r.duration} · {r.free ? "Free" : "Paid"}
                  </p>
                </motion.a>
              ))}
            </div>

            {data.practiceProjects?.length ? (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Practice projects
                </p>
                {data.practiceProjects.map((p, i) => (
                  <div
                    key={p.title ? `${p.title}-${i}` : `project-${i}`}
                    className="rounded-xl border border-gray-100 bg-gray-50/80 p-3"
                  >
                    <p className="text-sm font-medium text-gray-800">{p.title}</p>
                    <p className="mt-1 text-xs text-gray-500">{p.description}</p>
                    <p className="mt-1 text-[11px] text-gray-400">Difficulty: {p.difficulty}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        <SheetFooter className="mt-6 border-t border-gray-100 pt-4">
          <Button
            className="w-full rounded-lg bg-violet-600 hover:bg-violet-700"
            onClick={close}
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
