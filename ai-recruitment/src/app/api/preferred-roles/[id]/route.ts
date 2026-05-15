import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { RoleIntelligenceService } from "@/services/role-intelligence/role-intelligence.service";

const service = new RoleIntelligenceService();

export async function DELETE(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(req, async (authedReq) => {
    try {
      const data = await service.deletePreferredRole(authedReq.user!.email, id);
      return NextResponse.json(data);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to delete preferred role";
      if (msg.includes("not found")) {
        return NextResponse.json({ error: msg }, { status: 404 });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  });
}
