import { NextResponse } from "next/server";
import { withAuth, UnauthorizedError } from "@/lib/auth-helpers";

/**
 * @deprecated Use POST /api/v1/resumes/upload and the parse pipeline instead.
 * Legacy OpenAI analyze produced a separate atsScore inconsistent with ATSEngine.
 */
export async function POST() {
  try {
    await withAuth();
    return NextResponse.json(
      {
        error:
          "This endpoint is deprecated. Upload your resume via POST /api/v1/resumes/upload to parse and score with the canonical ATS pipeline.",
        code: "DEPRECATED_ANALYZE",
        replacement: "/api/v1/resumes/upload",
      },
      { status: 410 }
    );
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
