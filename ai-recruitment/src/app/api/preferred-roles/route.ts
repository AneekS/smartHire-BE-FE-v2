import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { CreatePreferredRoleSchema } from "@/lib/validators/preferred-role.schema";
import { RoleIntelligenceService } from "@/services/role-intelligence/role-intelligence.service";

const service = new RoleIntelligenceService();

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const data = await service.listByUserEmail(authedReq.user!.email);
      return NextResponse.json(data);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to fetch preferred roles" },
        { status: 500 }
      );
    }
  });
}

export async function POST(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    try {
      const parsed = CreatePreferredRoleSchema.parse(await req.json());
      const data = await service.createPreferredRole(authedReq.user!.email, parsed);
      return NextResponse.json(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues.map((i) => i.message).join(", ") }, { status: 400 });
      }
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to save preferred role" },
        { status: 500 }
      );
    }
  });
}
