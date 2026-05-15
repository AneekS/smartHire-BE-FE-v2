import { z } from "zod";
import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { SalaryProfileSchema } from "@/lib/validators/salary.schema";
import { SalaryController } from "@/modules/compensation-service/controllers/salary.controller";

const controller = new SalaryController();

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      return await controller.getProfile(authedReq.user!.email);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to fetch salary profile" },
        { status: 500 }
      );
    }
  });
}

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const payload = SalaryProfileSchema.parse(await req.json());
      return await controller.upsertProfile(authedReq.user!.email, payload);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues.map((i) => i.message).join(", ") }, { status: 400 });
      }
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to update salary profile" },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      return await controller.deleteProfile(authedReq.user!.email);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to delete salary profile" },
        { status: 500 }
      );
    }
  });
}
