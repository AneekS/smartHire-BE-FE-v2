import { SENIORITY_BANDS } from "@/scoring/constants";
import type { JobSchemaType } from "@/models/job.schema";
import type { ResumeSchemaType } from "@/models/resume.schema";

export function seniorityBandIndex(band: string | null | undefined): number {
  if (!band) return -1;
  const short = band.startsWith("L") && band.includes("_") ? band.slice(0, 2) : band.slice(0, 2);
  return SENIORITY_BANDS.indexOf(short as (typeof SENIORITY_BANDS)[number]);
}

export function scoreSeniorityMatch(
  resume: ResumeSchemaType,
  jd: JobSchemaType
): { score: number; reason: string } {
  const cIdx = seniorityBandIndex(resume.seniorityBand ?? "L3");
  const eIdx = seniorityBandIndex(jd.seniorityExpected ?? "L3");

  if (cIdx < 0 || eIdx < 0) {
    return { score: 70, reason: "Seniority band not specified" };
  }

  const diff = Math.abs(cIdx - eIdx);
  if (diff === 0) return { score: 100, reason: "Exact seniority band match" };
  if (diff === 1) return { score: 75, reason: "Adjacent seniority band" };
  return { score: 45, reason: `Seniority gap: ${diff} bands` };
}
