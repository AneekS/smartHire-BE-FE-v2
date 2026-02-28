import { NextResponse } from "next/server";
import {
  withAuth,
  AuthenticatedRequest,
} from "@/lib/auth-middleware";
import { requireAuth } from "@/lib/insforge-server";

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    const candidateId = authedReq.user!.candidateId ?? authedReq.user!.id;

    const { client } = await requireAuth();

    const { data: resumes, error } = await client.database
      .from("resumes")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = await Promise.all(
      (resumes ?? []).map(async (r) => {
        const [{ data: atsRow }, { data: improvements }] = await Promise.all([
          client.database
            .from("ats_scores")
            .select("overall_score")
            .eq("resume_id", r.id)
            .is("job_id", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          client.database
            .from("resume_improvements")
            .select("*")
            .eq("resume_id", r.id)
            .is("job_id", null),
        ]);
        const score = atsRow?.overall_score ?? null;
        const suggestions = (improvements ?? []).map((s: Record<string, unknown>) => ({
          id: s.id,
          type: s.type ?? "IMPROVEMENT",
          section: s.section ?? "",
          title: s.explanation ?? s.suggested_text ?? "",
          description: s.explanation ?? "",
          applied: false,
        }));
        return {
          id: r.id,
          title: r.file_name,
          fileUrl: r.file_url,
          roleTarget: null,
          atsScore: score,
          status: r.parse_status === "DONE" ? "ACTIVE" : r.parse_status ?? "PENDING",
          updatedAt: r.created_at,
          suggestions,
        };
      })
    );

    return NextResponse.json(result);
  });
}
