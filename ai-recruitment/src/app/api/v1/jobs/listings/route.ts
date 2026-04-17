import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { UnauthorizedError, withAuth } from "@/lib/auth-helpers";
import { insforge } from "@/lib/insforge";

function escapeIlike(raw: string) {
  return raw.replace(/[%_\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  try {
    const { dbUser } = await withAuth(req);
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const searchRaw = searchParams.get("search");

    let query = insforge.database
      .from("job_listings")
      .select(
        `
        id, job_title, company_name, company_logo, location,
        job_type, experience_level, salary_range, tech_stack,
        category, is_featured, posted_at, requirements
      `
      )
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("posted_at", { ascending: false });

    if (category && category !== "All") {
      query = query.eq("category", category);
    }

    if (searchRaw?.trim()) {
      const term = escapeIlike(searchRaw.trim());
      query = query.or(
        `job_title.ilike.%${term}%,company_name.ilike.%${term}%,category.ilike.%${term}%`
      );
    }

    const { data, error } = await query;

    if (error) return err(error.message, 500);

    const rows = data ?? [];
    const jobIds = rows.map((j: { id: string }) => j.id);

    let scoreMap: Record<
      string,
      { score: number; label: string | null }
    > = {};

    if (jobIds.length > 0) {
      const { data: existingScores, error: scoreErr } = await insforge.database
        .from("job_ats_scores")
        .select("job_listing_id, overall_score, score_label, created_at")
        .eq("candidate_id", dbUser.id)
        .in("job_listing_id", jobIds);

      if (scoreErr) return err(scoreErr.message, 500);

      const sorted = [...(existingScores ?? [])].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const seen = new Set<string>();
      for (const s of sorted) {
        const jid = s.job_listing_id as string | null;
        if (!jid || seen.has(jid)) continue;
        seen.add(jid);
        scoreMap[jid] = {
          score: s.overall_score as number,
          label: (s.score_label as string | null) ?? null,
        };
      }
    }

    const enriched = rows.map((job: { id: string }) => ({
      ...job,
      existingScore: scoreMap[job.id] ?? null,
    }));

    return ok(enriched);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return err(error.message, 401);
    }
    const msg = error instanceof Error ? error.message : "Failed to fetch";
    return err(msg, 500);
  }
}
