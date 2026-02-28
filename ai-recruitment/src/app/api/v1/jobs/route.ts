import { NextRequest, NextResponse } from "next/server";
import { insforge } from "@/lib/insforge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

    const { data: jobs, error } = await insforge.database
      .from("jobs")
      .select("*")
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ jobs: jobs ?? [], page, limit });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
