import type { ResumeSchemaType } from "@/models/resume.schema";

export type CandidateYearsResult = {
  years: number;
  isEstimate: boolean;
};

function parseMonthStart(dateStr: string): Date {
  return new Date(dateStr.slice(0, 7) + "-01");
}

function mergeIntervals(intervals: Array<{ start: Date; end: Date }>): Array<{ start: Date; end: Date }> {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: Array<{ start: Date; end: Date }> = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current.start.getTime() <= last.end.getTime()) {
      if (current.end.getTime() > last.end.getTime()) {
        last.end = current.end;
      }
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
}

function monthsFromIntervals(intervals: Array<{ start: Date; end: Date }>): number {
  let totalMonths = 0;
  for (const { start, end } of intervals) {
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (months > 0) totalMonths += months;
  }
  return totalMonths;
}

export function estimateYearsFromEntries(
  experience: ResumeSchemaType["experience"]
): CandidateYearsResult {
  if (!experience || experience.length === 0) return { years: 0, isEstimate: false };

  const now = new Date();
  const intervals: Array<{ start: Date; end: Date }> = [];

  for (const entry of experience) {
    if (!entry.startDate) continue;
    const start = parseMonthStart(entry.startDate);
    const end =
      entry.isCurrent || !entry.endDate ? now : parseMonthStart(entry.endDate);
    if (end.getTime() >= start.getTime()) {
      intervals.push({ start, end });
    }
  }

  const totalMonths = monthsFromIntervals(mergeIntervals(intervals));

  if (totalMonths > 0) {
    return { years: Math.round((totalMonths / 12) * 10) / 10, isEstimate: false };
  }

  return { years: experience.length * 1.5, isEstimate: true };
}

export function resolveCandidateYears(resume: ResumeSchemaType): CandidateYearsResult {
  if (resume.yearsOfExperience != null) {
    return { years: resume.yearsOfExperience, isEstimate: false };
  }
  return estimateYearsFromEntries(resume.experience ?? []);
}
