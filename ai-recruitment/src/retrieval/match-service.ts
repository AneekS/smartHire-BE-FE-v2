import { ResumeScorer, type ScoreOptions } from "@/scoring/scorer";
import type { ResumeSchemaType } from "@/models/resume.schema";
import type { JobSchemaType } from "@/models/job.schema";
import type { ScoreResult } from "@/models/scoring.schema";

const scorer = new ResumeScorer();

export async function scoreResumeAgainstJob(
  resume: ResumeSchemaType,
  job: JobSchemaType,
  candidateId: string,
  options?: ScoreOptions | string
): Promise<ScoreResult> {
  return scorer.score(resume, job, candidateId, options);
}
