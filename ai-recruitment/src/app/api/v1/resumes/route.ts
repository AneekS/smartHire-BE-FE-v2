import { NextResponse } from "next/server";
import {
  withAuth,
  AuthenticatedRequest,
} from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    const userEmail = authedReq.user!.email;

    if (!userEmail) {
      return NextResponse.json({ error: "No email associated with session" }, { status: 400 });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
      });

      if (!user) {
        return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
      }

      const resumes = await prisma.resumeVersion.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        include: {
          suggestions: true,
        },
      });

      type ResumeWithSuggestions = {
        id: string; title: string; fileUrl: string | null; roleTarget: string | null;
        atsScore: number | null; status: string; updatedAt: Date;
        suggestions?: { id: string; type: string; section: string; title: string; description: string; applied: boolean }[];
      };

      const result = resumes.map((r: unknown) => {
        const rv = r as ResumeWithSuggestions;
        const suggestions = (rv.suggestions ?? []).map((s) => ({
          id: s.id,
          type: s.type,
          section: s.section,
          title: s.title,
          description: s.description,
          applied: s.applied,
        }));

        return {
          id: rv.id,
          title: rv.title,
          fileUrl: rv.fileUrl,
          roleTarget: rv.roleTarget,
          atsScore: rv.atsScore,
          status: rv.status,
          updatedAt: rv.updatedAt.toISOString(),
          suggestions,
        };
      });

      return NextResponse.json(result);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Server error";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}
