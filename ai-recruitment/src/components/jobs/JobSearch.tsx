"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, BriefcaseBusiness, MapPin, Sparkles, TrendingUp, Zap } from "lucide-react";
import { toast } from "sonner";
import { useJobs } from "@/hooks/useJobs";
import { jobsApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const experienceOptions = [
  { label: "Any Experience", value: "ANY" },
  { label: "0-1 years", value: "0-1" },
  { label: "1-3 years", value: "1-3" },
  { label: "3-5 years", value: "3-5" },
  { label: "5+ years", value: "5+" },
] as const;

const salaryOptions = [
  { label: "Any Salary", value: "ANY" },
  { label: "INR 3L - INR 6L", value: "3-6" },
  { label: "INR 6L - INR 12L", value: "6-12" },
  { label: "INR 12L+", value: "12+" },
] as const;

const workModeOptions = [
  { label: "Any Work Mode", value: "ANY" },
  { label: "Remote", value: "REMOTE" },
  { label: "Hybrid", value: "HYBRID" },
  { label: "On-site", value: "ONSITE" },
] as const;

const jobTypeOptions = [
  { label: "Any Job Type", value: "ANY" },
  { label: "Full-time", value: "FULL_TIME" },
  { label: "Internship", value: "INTERNSHIP" },
  { label: "Contract", value: "CONTRACT" },
] as const;

export function JobSearch() {
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState("ANY");
  const [salary, setSalary] = useState("ANY");
  const [workMode, setWorkMode] = useState("ANY");
  const [jobType, setJobType] = useState("ANY");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [alertLoading, setAlertLoading] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const [debouncedFilters, setDebouncedFilters] = useState({
    role: "",
    location: "",
    skills: "",
    experience: "",
    salary: "",
    workMode: "",
    jobType: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters({
        role,
        location,
        skills: skills.join(","),
        experience: experience === "ANY" ? "" : experience,
        salary: salary === "ANY" ? "" : salary,
        workMode: workMode === "ANY" ? "" : workMode,
        jobType: jobType === "ANY" ? "" : jobType,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [role, location, skills, experience, salary, workMode, jobType]);

  const searchParams = useMemo(
    () => ({
      role: debouncedFilters.role || undefined,
      location: debouncedFilters.location || undefined,
      skills: debouncedFilters.skills || undefined,
      experience: debouncedFilters.experience || undefined,
      salary: debouncedFilters.salary || undefined,
      workMode: (debouncedFilters.workMode as "REMOTE" | "HYBRID" | "ONSITE" | "") || undefined,
      jobType:
        (debouncedFilters.jobType as
          | "FULL_TIME"
          | "PART_TIME"
          | "CONTRACT"
          | "INTERNSHIP"
          | "REMOTE"
          | "") || undefined,
      limit: 20,
    }),
    [debouncedFilters]
  );

  const { jobs, isLoading, isLoadingMore, hasMore, loadMore, apply, toggleSave, savedIds } =
    useJobs(searchParams);

  const addSkill = () => {
    const value = skillInput.trim();
    if (!value) return;
    if (!skills.includes(value)) {
      setSkills((prev) => [...prev, value]);
    }
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((item) => item !== skill));
  };

  const onApply = async (jobId: string) => {
    setApplyingId(jobId);
    try {
      await apply(jobId);
    } finally {
      setApplyingId(null);
    }
  };

  const onCreateAlert = async () => {
    if (!role.trim()) {
      toast.error("Enter a role before creating a job alert");
      return;
    }

    setAlertLoading(true);
    try {
      await jobsApi.createAlert({
        role: role.trim(),
        location: location.trim() || undefined,
      });
      toast.success("Job alert created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create alert");
    } finally {
      setAlertLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-xl border bg-card p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-muted-foreground">Role / Job Title</label>
              <Input
                placeholder="Search by role or job title"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-muted-foreground">Location</label>
              <Input
                placeholder="Search by city or location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-muted-foreground">Experience Level</label>
              <Select value={experience} onValueChange={setExperience}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Experience" />
                </SelectTrigger>
                <SelectContent>
                  {experienceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-muted-foreground">Salary Range</label>
              <Select value={salary} onValueChange={setSalary}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Salary Range" />
                </SelectTrigger>
                <SelectContent>
                  {salaryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-muted-foreground">Work Mode</label>
              <Select value={workMode} onValueChange={setWorkMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Work Mode" />
                </SelectTrigger>
                <SelectContent>
                  {workModeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-muted-foreground">Job Type</label>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Job Type" />
                </SelectTrigger>
                <SelectContent>
                  {jobTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-muted-foreground">Skills</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Add required skills (e.g. Node.js, Docker)"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
              />
              <Button variant="secondary" onClick={addSkill} className="sm:w-auto w-full">
                Add skill
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Button onClick={onCreateAlert} disabled={alertLoading} className="w-full sm:w-auto">
              {alertLoading ? "Creating..." : "Create Job Alert"}
            </Button>
          </div>
        </div>

        {skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => removeSkill(skill)}
              >
                {skill} x
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {isLoading && jobs.length === 0 ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : jobs.length === 0 ? (
        <Card className="p-10 text-center rounded-2xl">
          <p className="text-slate-500">No jobs found for current filters.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const isSaved = savedIds.has(job.id);
            return (
              <Card key={job.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:justify-between">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <BriefcaseBusiness className="w-4 h-4 text-primary" />
                        {job.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                        {job.company.name} - {job.location}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{job.matchScore}% Match</Badge>
                      <Badge variant="outline">You are {job.readiness}% ready for this job</Badge>
                      <Badge variant="outline">{job.postedAgo}</Badge>
                      <Badge variant="outline">{job.applicants} applicants</Badge>
                      {job.trending && (
                        <Badge className="bg-orange-500/10 text-orange-700 border-orange-400/30">
                          <TrendingUp className="w-3 h-3 mr-1" /> Trending job
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(job.skills ?? []).slice(0, 8).map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>

                    {job.missingSkills.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">Missing skills</p>
                        <div className="flex flex-wrap gap-2">
                          {job.missingSkills.map((skill) => (
                            <Badge key={skill} variant="outline">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-sm text-slate-500 space-y-1">
                      <p>
                        Salary: {job.salaryMin != null ? `₹${job.salaryMin}L` : "-"}
                        {job.salaryMax != null ? ` - ₹${job.salaryMax}L` : ""}
                      </p>
                      <p>
                        Mode: {job.workMode ?? "N/A"} | Type: {job.jobType ?? "N/A"}
                      </p>
                      <p>Experience: {job.experienceLevel ?? "Not specified"}</p>
                    </div>
                  </div>

                  <div className="w-full lg:w-65 space-y-3">
                    <Card className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                      <p className="text-xs font-semibold text-slate-500">Company Insight</p>
                      <p className="text-sm font-semibold mt-1">{job.company.name}</p>
                      <p className="text-xs text-slate-500">Industry: {job.company.industry ?? "N/A"}</p>
                      <p className="text-xs text-slate-500">Size: {job.company.size ?? "N/A"}</p>
                      <p className="text-xs text-slate-500">
                        Avg Salary: {job.company.averageSalaryL != null ? `₹${job.company.averageSalaryL}L` : "N/A"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Rating: {job.company.employeeRating != null ? job.company.employeeRating.toFixed(1) : "N/A"}
                      </p>
                    </Card>

                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => onApply(job.id)} disabled={applyingId === job.id}>
                        {applyingId === job.id ? "Applying..." : "Apply"}
                        <Zap className="w-4 h-4 ml-2" />
                      </Button>
                      <Button
                        variant={isSaved ? "default" : "outline"}
                        onClick={() => toggleSave(job.id, !isSaved)}
                      >
                        <Bookmark className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {job.location}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
                {isLoadingMore ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-pulse" /> Loading...
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
