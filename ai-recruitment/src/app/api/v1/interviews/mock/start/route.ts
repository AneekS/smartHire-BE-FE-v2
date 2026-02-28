import { NextResponse } from "next/server";
import {
  withAuth,
  AuthenticatedRequest,
} from "@/lib/auth-middleware";
import { requireAuth } from "@/lib/insforge-server";
import { z } from "zod";

const BodySchema = z.object({
  target_role: z.string().default("Software Engineer"),
  session_type: z.enum(["BEHAVIORAL", "TECHNICAL", "HR", "SYSTEM_DESIGN", "MIXED"]).default("TECHNICAL"),
});

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    const candidateId = authedReq.user!.candidateId ?? authedReq.user!.id;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const { target_role, session_type } = BodySchema.parse(body);

    const { client } = await requireAuth();

    const { data: session, error } = await client.database
      .from("mock_interviews")
      .insert({
        candidate_id: candidateId,
        target_role,
        session_type,
        status: "IN_PROGRESS",
        messages: [],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        id: session.id,
        title: target_role,
        type: session_type,
        status: session.status,
        startedAt: session.started_at,
        messages: [],
      },
      { status: 201 }
    );
  });
}
