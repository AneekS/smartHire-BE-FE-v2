import { NextResponse } from "next/server";
import {
  withAuth,
  AuthenticatedRequest,
} from "@/lib/auth-middleware";
import { requireAuth } from "@/lib/insforge-server";
import { CandidateProfileSchema } from "@/lib/validators/candidate.schema";
import { handleError } from "@/lib/errors";

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    const candidateId = authedReq.user!.candidateId ?? authedReq.user!.id;

    const { client } = await requireAuth();

    const { data: candidate, error } = await client.database
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(candidate);
  });
}

export async function PATCH(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    const candidateId = authedReq.user!.candidateId ?? authedReq.user!.id;

    const body = await req.json();
    const data = CandidateProfileSchema.parse(body);

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.headline !== undefined) updateData.headline = data.headline;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.preferredRoles !== undefined)
      updateData.preferred_roles = data.preferredRoles;
    if (data.salaryExpectationMin !== undefined)
      updateData.salary_expectation_min = data.salaryExpectationMin;
    if (data.salaryExpectationMax !== undefined)
      updateData.salary_expectation_max = data.salaryExpectationMax;
    if (data.visibility !== undefined) updateData.visibility = data.visibility;

    const { client } = await requireAuth();

    const { data: updated, error } = await client.database
      .from("candidates")
      .update(updateData)
      .eq("id", candidateId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  });
}
