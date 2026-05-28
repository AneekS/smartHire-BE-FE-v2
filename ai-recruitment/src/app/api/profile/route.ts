import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  headline: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  school: z.string().optional(),
  graduationYear: z.string().optional(),
  linkedInUrl: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  jobAlerts: z.boolean().optional(),
  aiSuggestions: z.boolean().optional(),
  publicProfile: z.boolean().optional(),
});

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { candidate: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name ?? user.email.split("@")[0],
      email: user.email,
      image: user.image ?? user.candidate?.avatarUrl ?? null,
      headline: user.headline ?? null,
      phone: user.phone ?? null,
      location: user.location ?? null,
      school: user.school ?? null,
      graduationYear: user.graduationYear ?? null,
      linkedInUrl: user.linkedInUrl ?? null,
      githubUrl: user.githubUrl ?? null,
      websiteUrl: user.websiteUrl ?? null,
      jobAlerts: user.jobAlerts,
      aiSuggestions: user.aiSuggestions,
      publicProfile: user.publicProfile,
      reputationScore: user.reputationScore,
      technicalScore: user.technicalScore,
      softScore: user.softScore,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: data.name,
        headline: data.headline,
        phone: data.phone,
        location: data.location,
        school: data.school,
        graduationYear: data.graduationYear,
        linkedInUrl: data.linkedInUrl || null,
        githubUrl: data.githubUrl || null,
        websiteUrl: data.websiteUrl || null,
        jobAlerts: data.jobAlerts,
        aiSuggestions: data.aiSuggestions,
        publicProfile: data.publicProfile,
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      headline: updated.headline,
      phone: updated.phone,
      location: updated.location,
      school: updated.school,
      graduationYear: updated.graduationYear,
      linkedInUrl: updated.linkedInUrl,
      githubUrl: updated.githubUrl,
      websiteUrl: updated.websiteUrl,
      jobAlerts: updated.jobAlerts,
      aiSuggestions: updated.aiSuggestions,
      publicProfile: updated.publicProfile,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues.map((x) => x.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
