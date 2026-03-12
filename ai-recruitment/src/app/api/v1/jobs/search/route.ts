import { NextRequest, NextResponse } from "next/server";
import { insforge } from "@/lib/insforge";
import { JobSearchSchema } from "@/lib/validators/job.schema";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const params = Object.fromEntries(searchParams);
    const { role, location, skills, experience, limit } =
      JobSearchSchema.parse(params);
    const page = 1;

    let query = insforge.database
      .from("jobs")
      .select("*")
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (role) {
      query = query.ilike("title", `%${role}%`);
    }
    if (location) {
      query = query.or(
        `city.ilike.%${location}%,state.ilike.%${location}%,is_remote.eq.true`
      );
    }
    if (experience) {
      query = query.lte("experience_min", parseFloat(experience));
    }
    if (skills) {
      const skillArr = skills.split(",").map((s) => s.trim());
      if (skillArr.length > 0) {
        query = query.overlaps("required_skills", skillArr);
      }
    }

    const { data: jobs, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      jobs: jobs ?? [],
      page,
      limit,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
