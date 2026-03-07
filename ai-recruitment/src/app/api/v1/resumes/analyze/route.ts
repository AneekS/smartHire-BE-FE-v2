import { NextResponse } from "next/server";
import {
    withAuth,
    AuthenticatedRequest,
} from "@/lib/auth-middleware";
import { prisma } from "@/lib/db";
import { getOrCreateCandidate } from "@/services/profile/profile.service";

export async function POST(req: AuthenticatedRequest) {
    return withAuth(req, async (authedReq) => {
        try {
            const { resumeId } = await req.json();

            if (!resumeId) {
                return NextResponse.json({ error: "No resumeId provided" }, { status: 400 });
            }

            // Check if candidate exists for this user
            const candidate = await getOrCreateCandidate(authedReq.user!.email);

            // Verify resume belongs to user
            const existing = await prisma.resumeVersion.findFirst({
                where: { id: resumeId, userId: candidate.user!.id },
            });

            if (!existing) {
                return NextResponse.json({ error: "Resume not found" }, { status: 404 });
            }

            // Set resume as active
            await prisma.resumeVersion.updateMany({
                where: { userId: candidate.user!.id },
                data: { status: "DRAFT" },
            });

            const suggestions = [
                {
                    type: "CRITICAL" as const,
                    section: "Experience",
                    title: "Missing Quantifiable Results",
                    description: "Add numbers to your achievements to show measurable impact.",
                },
                {
                    type: "IMPROVEMENT" as const,
                    section: "Skills",
                    title: "Optimize Keywords",
                    description: "Include more exact keyword matches for Target Job Roles.",
                },
            ];

            // Create new ResumeVersion with score and simulate suggestions
            const resume = await prisma.resumeVersion.update({
                where: { id: resumeId },
                data: {
                    status: "ACTIVE",
                    atsScore: 75,
                    suggestions: {
                        create: suggestions
                    }
                },
                include: {
                    suggestions: true,
                }
            });

            const parsed = {
                name: candidate.name,
                email: candidate.email,
                experience: [],
                education: [],
                skills: [],
            };

            return NextResponse.json(
                {
                    resume: { id: resume.id, file_name: resume.title, created_at: resume.createdAt },
                    parsed,
                    ats_score: 75,
                    suggestions_count: suggestions.length,
                    message: "Resume analyzed successfully",
                },
                { status: 200 }
            );
        } catch (e) {
            console.error(e);
            const msg = e instanceof Error ? e.message : "Analyze error";
            return NextResponse.json({ error: msg }, { status: 500 });
        }
    });
}
