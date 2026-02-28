import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/insforge-server";
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
    const { client, user } = await requireAuth();
    const { data: profile, error } = await client.database
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: user.id,
      name:
        (user as { name?: string }).name ??
        user.profile?.name ??
        String(user.email ?? "").split("@")[0],
      email: user.email,
      image: user.profile?.avatarUrl ?? null,
      headline: profile?.headline ?? null,
      phone: profile?.phone ?? null,
      location: profile?.location ?? null,
      school: profile?.school ?? null,
      graduationYear: profile?.graduation_year ?? null,
      linkedInUrl: profile?.linkedin_url ?? null,
      githubUrl: profile?.github_url ?? null,
      websiteUrl: profile?.website_url ?? null,
      jobAlerts: profile?.job_alerts ?? true,
      aiSuggestions: profile?.ai_suggestions ?? false,
      publicProfile: profile?.public_profile ?? true,
      reputationScore: profile?.reputation_score ?? 0,
      technicalScore: profile?.technical_score ?? 0,
      softScore: profile?.soft_score ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { client, user } = await requireAuth();
    const body = await req.json();
    const data = updateSchema.parse(body);

    const dbData: Record<string, unknown> = {};
    if (data.headline !== undefined) dbData.headline = data.headline;
    if (data.phone !== undefined) dbData.phone = data.phone;
    if (data.location !== undefined) dbData.location = data.location;
    if (data.school !== undefined) dbData.school = data.school;
    if (data.graduationYear !== undefined)
      dbData.graduation_year = data.graduationYear;
    if (data.linkedInUrl !== undefined)
      dbData.linkedin_url = data.linkedInUrl || null;
    if (data.githubUrl !== undefined)
      dbData.github_url = data.githubUrl || null;
    if (data.websiteUrl !== undefined)
      dbData.website_url = data.websiteUrl || null;
    if (data.jobAlerts !== undefined) dbData.job_alerts = data.jobAlerts;
    if (data.aiSuggestions !== undefined)
      dbData.ai_suggestions = data.aiSuggestions;
    if (data.publicProfile !== undefined)
      dbData.public_profile = data.publicProfile;

    const { data: existing } = await client.database
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    let profile: Record<string, unknown> | null = null;
    if (existing) {
      const res = await client.database
        .from("profiles")
        .update({ ...dbData, updated_at: new Date().toISOString() })
        .eq("id", user.id)
        .select()
        .single();
      if (res.error) {
        return NextResponse.json({ error: res.error.message }, { status: 500 });
      }
      profile = res.data;
    } else {
      const res = await client.database
        .from("profiles")
        .insert({ id: user.id, ...dbData })
        .select()
        .single();
      if (res.error) {
        return NextResponse.json({ error: res.error.message }, { status: 500 });
      }
      profile = res.data;
    }

    return NextResponse.json({
      id: user.id,
      name:
        data.name ??
        (user as { name?: string }).name ??
        user.profile?.name,
      headline: profile?.headline,
      phone: profile?.phone,
      location: profile?.location,
      school: profile?.school,
      graduationYear: profile?.graduation_year,
      linkedInUrl: profile?.linkedin_url,
      githubUrl: profile?.github_url,
      websiteUrl: profile?.website_url,
      jobAlerts: profile?.job_alerts,
      aiSuggestions: profile?.ai_suggestions,
      publicProfile: profile?.public_profile,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.issues.map((x) => x.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
}
