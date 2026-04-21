"use client";

import { useMemo, useState } from "react";
import { BriefcaseBusiness, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useJobRecommendations } from "@/hooks/useJobRecommendations";
import { jobsApi, type RecommendedJob } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function JobRecommendationCard({
  job,
  applying,
  onApply,
}: {
  job: RecommendedJob;
  applying: boolean;
  onApply: (jobId: string) => Promise<void>;
}) {
  const title = job?.title ?? "Untitled role";
  const companyName = job?.company?.name ?? "—";
  const location = job?.location ?? "—";
  const reasons = Array.isArray(job?.reasons) ? job.reasons : [];
  const missingSkills = Array.isArray(job?.missingSkills) ? job.missingSkills : [];
  const matchScore = typeof job?.matchScore === "number" ? job.matchScore : 0;
  const readinessScore = typeof job?.readinessScore === "number" ? job.readinessScore : 0;
  const semanticScore = typeof job?.semanticScore === "number" ? job.semanticScore : 0;
  const jobId = job?.id ?? "";

  return (
    <Card className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2">
            <BriefcaseBusiness className="w-4 h-4 text-primary" />
            {title}
          </h4>
          <p className="text-sm text-muted-foreground">
            {companyName} | {location}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{matchScore}% match</Badge>
            <Badge variant="outline">Readiness {readinessScore}%</Badge>
            <Badge variant="outline">Semantic {semanticScore}%</Badge>
          </div>
          {reasons.length > 0 && (
            <ul className="text-xs text-muted-foreground space-y-1">
              {reasons.map((reason, i) => (
                <li key={`${reason}-${i}`}>- {reason}</li>
              ))}
            </ul>
          )}
          {missingSkills.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {missingSkills.map((skill) => (
                <Badge key={skill} variant="outline">
                  Missing: {skill}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Button disabled={applying || !jobId} onClick={() => onApply(jobId)}>
          {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
        </Button>
      </div>
    </Card>
  );
}

function EmptySection({ message }: { message: string }) {
  return (
    <p className="text-sm text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center">
      {message}
    </p>
  );
}

export function JobRecommendationsFeed() {
  const { recommendations, isLoading, isValidating, error, mutate } = useJobRecommendations(20);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const exploreCareers = useMemo(() => {
    const roles = recommendations?.marketIntelligence?.highDemandRoles;
    if (!Array.isArray(roles)) return [];
    return roles.slice(0, 5).filter((r) => r && typeof r.role === "string");
  }, [recommendations]);

  const recommendedJobs = recommendations?.recommendedJobs ?? [];
  const highMatchJobs = recommendations?.highMatchJobs ?? [];
  const trendingJobs = recommendations?.trendingJobs ?? [];

  const onApply = async (jobId: string) => {
    setApplyingId(jobId);
    try {
      await jobsApi.apply({ job_id: jobId });
      await jobsApi.trackBehaviorEvent({ jobId, eventType: "JOB_APPLICATION" });
      toast.success("Application submitted successfully");
      await mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply");
    } finally {
      setApplyingId(null);
    }
  };

  if (isLoading && !recommendations) {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <p className="text-sm text-muted-foreground">Loading recommendations…</p>
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="rounded-xl p-6 text-sm text-muted-foreground">
        We couldn&apos;t load recommendations.{" "}
        <button
          type="button"
          className="font-medium text-primary underline-offset-4 hover:underline"
          onClick={() => void mutate()}
        >
          Try again
        </button>
      </Card>
    );
  }

  if (!recommendations) {
    return (
      <Card className="rounded-xl p-6 text-sm text-muted-foreground">
        Recommendations are not available right now.
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {isValidating && (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Refreshing…
        </p>
      )}

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Recommended for you</h3>
        {recommendedJobs.length > 0 ? (
          <div className="grid gap-3">
            {recommendedJobs.slice(0, 6).map((job, index) => (
              <JobRecommendationCard
                key={job?.id ?? `recommended-${index}`}
                job={job}
                applying={applyingId === job?.id}
                onApply={onApply}
              />
            ))}
          </div>
        ) : (
          <EmptySection message="No personalized recommendations yet. Complete your profile to improve matches." />
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">High match jobs</h3>
        {highMatchJobs.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {highMatchJobs.slice(0, 4).map((job, index) => (
              <JobRecommendationCard
                key={job?.id ?? `high-${index}`}
                job={job}
                applying={applyingId === job?.id}
                onApply={onApply}
              />
            ))}
          </div>
        ) : (
          <EmptySection message="No high-match jobs to show right now." />
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Trending jobs</h3>
        {trendingJobs.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {trendingJobs.slice(0, 4).map((job, index) => (
              <JobRecommendationCard
                key={job?.id ?? `trending-${index}`}
                job={job}
                applying={applyingId === job?.id}
                onApply={onApply}
              />
            ))}
          </div>
        ) : (
          <EmptySection message="No trending jobs available at the moment." />
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Explore careers</h3>
        {exploreCareers.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-3">
            {exploreCareers.map((role, index) => (
              <Card key={`${role.role}-${index}`} className="rounded-xl p-4">
                <p className="font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  {role.role}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Openings: {typeof role.demandCount === "number" ? role.demandCount : "—"}
                </p>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center">
            No market insights available yet.
          </div>
        )}
      </section>
    </div>
  );
}
