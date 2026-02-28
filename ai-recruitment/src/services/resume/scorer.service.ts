import { requireAuth } from "@/lib/insforge-server";

interface ScoreWeights {
  keywords: number;
  skills: number;
  experience: number;
  education: number;
  format: number;
}

const DEFAULT_WEIGHTS: ScoreWeights = {
  keywords: 30,
  skills: 25,
  experience: 20,
  education: 15,
  format: 10,
};

export class ScorerService {
  async computeBaseScore(
    resumeId: string,
    candidateId: string
  ): Promise<number> {
    const { client } = await requireAuth();

    const { data: parsed } = await client.database
      .from("parsed_resumes")
      .select("*")
      .eq("resume_id", resumeId)
      .maybeSingle();

    if (!parsed) throw new Error("Parsed resume not found");

    const scores = {
      skills: this.scoreSkills(parsed),
      experience: this.scoreExperience(parsed),
      education: this.scoreEducation(parsed),
      format: this.scoreFormat(parsed),
      keywords: (parsed.quantification_score ?? 0) * 100,
    };

    const overall = Math.round(
      (scores.keywords * DEFAULT_WEIGHTS.keywords) / 100 +
        (scores.skills * DEFAULT_WEIGHTS.skills) / 100 +
        (scores.experience * DEFAULT_WEIGHTS.experience) / 100 +
        (scores.education * DEFAULT_WEIGHTS.education) / 100 +
        (scores.format * DEFAULT_WEIGHTS.format) / 100
    );

    await client.database.from("ats_scores").insert({
      resume_id: resumeId,
      candidate_id: candidateId,
      job_id: null,
      overall_score: overall,
      keyword_score: scores.keywords,
      skills_score: scores.skills,
      experience_score: scores.experience,
      education_score: scores.education,
      format_score: scores.format,
      score_breakdown: scores,
    });

    await client.database
      .from("parsed_resumes")
      .update({ ats_base_score: overall })
      .eq("resume_id", resumeId);

    return overall;
  }

  async computeJobScore(
    resumeId: string,
    candidateId: string,
    jobId: string
  ): Promise<{ score: number; matched: string[]; missing: string[] }> {
    const { client } = await requireAuth();

    const [{ data: parsed }, { data: job }] = await Promise.all([
      client.database
        .from("parsed_resumes")
        .select("*")
        .eq("resume_id", resumeId)
        .maybeSingle(),
      client.database.from("jobs").select("*").eq("id", jobId).maybeSingle(),
    ]);

    if (!parsed || !job) throw new Error("Resume or job not found");

    const candidateSkills = [
      ...(parsed.languages ?? []),
      ...(parsed.frameworks ?? []),
      ...(parsed.databases ?? []),
      ...(parsed.tools ?? []),
    ].map((s: string) => s.toLowerCase());

    const requiredSkills = (job.required_skills ?? []).map((s: string) =>
      s.toLowerCase()
    );
    const jobKeywords = this.extractKeywords(
      `${job.description} ${job.requirements ?? ""}`
    );

    const matchedSkills = requiredSkills.filter((s: string) =>
      candidateSkills.includes(s)
    );
    const missingSkills = requiredSkills.filter(
      (s: string) => !candidateSkills.includes(s)
    );
    const matchedKeywords = jobKeywords.filter(
      (k: string) =>
        (parsed.professional_summary ?? "").toLowerCase().includes(k) ||
        (parsed.experience ?? []).some((e: { description?: string }) =>
          (e.description ?? "").toLowerCase().includes(k)
        )
    );

    const skillScore =
      requiredSkills.length > 0
        ? (matchedSkills.length / requiredSkills.length) * 100
        : 50;
    const keywordScore =
      jobKeywords.length > 0
        ? (matchedKeywords.length / jobKeywords.length) * 100
        : 50;

    const overall = Math.round(skillScore * 0.6 + keywordScore * 0.4);

    await client.database
      .from("ats_scores")
      .delete()
      .eq("resume_id", resumeId)
      .eq("job_id", jobId);
    await client.database.from("ats_scores").insert({
      resume_id: resumeId,
      candidate_id: candidateId,
      job_id: jobId,
      overall_score: overall,
      matched_keywords: [...matchedSkills, ...matchedKeywords],
      missing_keywords: missingSkills,
      score_breakdown: { skillScore, keywordScore },
    });

    return {
      score: overall,
      matched: matchedSkills,
      missing: missingSkills,
    };
  }

  private scoreSkills(parsed: Record<string, unknown>): number {
    const total =
      ((parsed.languages as string[])?.length ?? 0) +
      ((parsed.frameworks as string[])?.length ?? 0) +
      ((parsed.databases as string[])?.length ?? 0) +
      ((parsed.tools as string[])?.length ?? 0);
    return Math.min((total / 15) * 100, 100);
  }

  private scoreExperience(parsed: Record<string, unknown>): number {
    const months = (parsed.total_experience_months as number) ?? 0;
    if (months === 0)
      return (parsed.has_internship as boolean) ? 40 : 20;
    return Math.min((months / 36) * 100, 100);
  }

  private scoreEducation(parsed: Record<string, unknown>): number {
    const edu = (parsed.education as { is_tier1?: boolean; cgpa?: number }[])?.[0];
    if (!edu) return 50;
    let score = 60;
    if (edu.is_tier1) score += 25;
    if (edu.cgpa && edu.cgpa >= 8.5) score += 15;
    else if (edu.cgpa && edu.cgpa >= 7.5) score += 10;
    return Math.min(score, 100);
  }

  private scoreFormat(parsed: Record<string, unknown>): number {
    let score = 60;
    if (parsed.professional_summary) score += 10;
    if (parsed.linkedin_url) score += 5;
    if (parsed.github_url) score += 10;
    if (parsed.portfolio_url) score += 10;
    if (parsed.has_open_source) score += 5;
    return Math.min(score, 100);
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      "the",
      "and",
      "or",
      "in",
      "at",
      "to",
      "for",
      "a",
      "an",
    ]);
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w))
      .slice(0, 50);
  }
}
