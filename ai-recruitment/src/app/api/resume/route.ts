import { NextRequest, NextResponse } from "next/server";
import { POST as uploadPost } from "@/app/api/v1/resumes/route";
import { GET as currentGet } from "@/app/api/v1/resumes/current/route";
import { withAuthContext, UnauthorizedError } from "@/lib/auth-middleware";
import { deleteUserResume } from "@/pipeline/resume-pipeline";
import type { AuthenticatedRequest } from "@/lib/auth-middleware";

/** Legacy alias: current resume for Resume Studio (not the versions list). */
export async function GET(req: NextRequest) {
  return currentGet(req as AuthenticatedRequest);
}

export async function POST(req: NextRequest) {
  return uploadPost(req as AuthenticatedRequest);
}

/** Legacy: delete all resumes for the signed-in user. */
export async function DELETE() {
  try {
    const { dbUser } = await withAuthContext();
    await deleteUserResume(dbUser.id);
    return NextResponse.json({ message: "Resume deleted successfully" });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 }
    );
  }
}

export { maxDuration } from "@/app/api/v1/resumes/route";
