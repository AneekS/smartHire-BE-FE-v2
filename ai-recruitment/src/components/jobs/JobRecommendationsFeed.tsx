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
  return (
    <Card className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2">
            <BriefcaseBusiness className="w-4 h-4 text-primary" />
            {job.title}
          </h4>
          <p className="text-sm text-muted-foreground">
            {job.company.name} | {job.location}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{job.matchScore}% match</Badge>
            <Badge variant="outline">Readiness {job.readinessScore}%</Badge>
            <Badge variant="outline">Semantic {job.semanticScore}%</Badge>
          </div>
          {job.reasons.length > 0 && (
            <ul className="text-xs text-muted-foreground space-y-1">
              {job.reasons.map((reason) => (
                <li key={reason}>- {reason}</li>
              ))}
            </ul>
          )}
          {job.missingSkills.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {job.missingSkills.map((skill) => (
                <Badge key={skill} variant="outline">
                  Missing: {skill}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Button disabled={applying} onClick={() => onApply(job.id)}>
          {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
        </Button>
      </div>
    </Card>
  );
}

export function JobRecommendationsFeed() {
  const { recommendations, isLoading, mutate } = useJobRecommendations(20);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const exploreCareers = useMemo(
    () => recommendations?.marketIntelligence.highDemandRoles.slice(0, 5) ?? [],
    [recommendations]
  );

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
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
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Recommended for you</h3>
        <div className="grid gap-3">
          {recommendations.recommendedJobs.slice(0, 6).map((job) => (
            <JobRecommendationCard
              key={job.id}
              job={job}
              applying={applyingId === job.id}
              onApply={onApply}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">High match jobs</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {recommendations.highMatchJobs.slice(0, 4).map((job) => (
            <JobRecommendationCard
              key={job.id}
              job={job}
              applying={applyingId === job.id}
              onApply={onApply}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Trending jobs</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {recommendations.trendingJobs.slice(0, 4).map((job) => (
            <JobRecommendationCard
              key={job.id}
              job={job}
              applying={applyingId === job.id}
              onApply={onApply}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Explore careers</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {exploreCareers.map((role) => (
            <Card key={role.role} className="rounded-xl p-4">
              <p className="font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                {role.role}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Openings: {role.demandCount}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
