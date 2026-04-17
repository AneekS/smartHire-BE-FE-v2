import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { UnauthorizedError, withAuth } from "@/lib/auth-helpers";
import { insforge } from "@/lib/insforge";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await withAuth(req);
    const { id } = await params;

    const { data, error } = await insforge.database
      .from("job_listings")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (error) return err(error.message, 500);
    if (!data) return err("Job not found", 404);

    const { data: existingScore } = await insforge.database
      .from("job_ats_scores")
      .select("*")
      .eq("candidate_id", dbUser.id)
      .eq("job_listing_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return ok({ ...data, existingScore: existingScore ?? null });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return err(error.message, 401);
    }
    const msg = error instanceof Error ? error.message : "Failed";
    return err(msg, 500);
  }
}
