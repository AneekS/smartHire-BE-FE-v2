import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  PreferenceBodySchema,
  PreferencePatchSchema,
  RecruiterFilterSchema,
  RoleFitQuerySchema,
  SalaryInsightsQuerySchema,
} from "../validators/preferences.validator";
import {
  createUserPreference,
  filterCandidatesForRecruiter,
  getPreferenceListPaginated,
  getUserPreference,
  updateUserPreference,
} from "../services/preference.service";
import { calculateRoleFitScore, getCareerTrajectoryInsights, getRoleFitScores } from "../services/role-fit.service";
import { getSalaryInsights } from "../services/salary-insight.service";

function zodErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Validation failed",
      issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    },
    { status: 400 },
  );
}

export async function createPreferenceController(userId: string, body: unknown) {
  try {
    const payload = PreferenceBodySchema.parse(body);
    const preference = await createUserPreference(userId, payload);
    return NextResponse.json({ success: true, data: { preference } }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return zodErrorResponse(error);
    return NextResponse.json({ success: false, error: "Failed to create preference" }, { status: 500 });
  }
}

export async function updatePreferenceController(userId: string, body: unknown) {
  try {
    const payload = PreferencePatchSchema.parse(body);
    const preference = await updateUserPreference(userId, payload);
    return NextResponse.json({ success: true, data: { preference } });
  } catch (error) {
    if (error instanceof ZodError) return zodErrorResponse(error);
    return NextResponse.json({ success: false, error: "Failed to update preference" }, { status: 500 });
  }
}

export async function getPreferenceController(userId: string) {
  try {
    const preference = await getUserPreference(userId);
    return NextResponse.json({ success: true, data: { preference } }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch preference" }, { status: 500 });
  }
}

export async function listPreferencesController(params: URLSearchParams) {
  const page = Number(params.get("page") ?? 1);
  const limit = Number(params.get("limit") ?? 20);
  const result = await getPreferenceListPaginated(page, limit);
  return NextResponse.json({ success: true, data: result });
}

export async function getSalaryInsightsController(params: URLSearchParams) {
  try {
    const query = SalaryInsightsQuerySchema.parse({
      role: params.get("role"),
      location: params.get("location"),
      experience: params.get("experience"),
    });

    const salaryInsight = await getSalaryInsights(query.role, query.location, query.experience);
    return NextResponse.json({ success: true, data: { salaryInsight } });
  } catch (error) {
    if (error instanceof ZodError) return zodErrorResponse(error);
    return NextResponse.json({ success: false, error: "Failed to load salary insights" }, { status: 500 });
  }
}

export async function getRoleFitController(userId: string, params: URLSearchParams) {
  try {
    const query = RoleFitQuerySchema.parse({
      refresh: params.get("refresh") ?? false,
      limit: params.get("limit") ?? 6,
      cursor: params.get("cursor") ?? undefined,
    });

    if (query.refresh) {
      await calculateRoleFitScore(userId);
    }

    const [scores, trajectory] = await Promise.all([
      getRoleFitScores(userId, query.limit),
      getCareerTrajectoryInsights(userId),
    ]);

    return NextResponse.json({ scores, trajectory });
  } catch (error) {
    if (error instanceof ZodError) return zodErrorResponse(error);
    return NextResponse.json({ success: false, error: "Failed to fetch role fit insights" }, { status: 500 });
  }
}

export async function recruiterFilterController(body: unknown) {
  try {
    const input = RecruiterFilterSchema.parse(body);
    const result = await filterCandidatesForRecruiter(input);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof ZodError) return zodErrorResponse(error);
    return NextResponse.json({ success: false, error: "Failed to filter candidates" }, { status: 500 });
  }
}
