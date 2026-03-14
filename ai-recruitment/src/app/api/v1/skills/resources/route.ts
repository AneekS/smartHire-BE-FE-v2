import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import type { AuthenticatedRequest } from "@/lib/auth-middleware";

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async () => {
    try {
      const body = await req.json();
      const skill = typeof body?.skill === "string" ? body.skill : "Skill";
      const currentLevel = body?.currentLevel ?? "intermediate";

      // Stub response until AI resource generation is wired
      const payload = {
        skill,
        estimatedTime: "3–4 weeks",
        difficulty: currentLevel === "beginner" ? "Beginner-friendly" : "Intermediate",
        resources: [
          { type: "course" as const, title: `${skill} – Official Documentation`, url: "https://example.com/docs", duration: "2–4 hrs", free: true },
          { type: "video" as const, title: `${skill} – Full Course`, url: "https://example.com/course", duration: "10–15 hrs", free: true },
          { type: "article" as const, title: `${skill} – Best Practices`, url: "https://example.com/article", duration: "30 min", free: true },
        ],
        practiceProjects: [
          { title: `Build a small ${skill} project`, description: "Apply concepts in a mini project.", difficulty: "Medium" },
        ],
      };

      return NextResponse.json(payload);
    } catch (e) {
      console.error("[POST /api/v1/skills/resources]", e);
      return NextResponse.json(
        { error: "Failed to load resources" },
        { status: 500 }
      );
    }
  });
}
