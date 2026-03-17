import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { getRoleFitController } from "@/modules/preferences/controllers/preferences.controller";

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    const url = new URL(authedReq.url);
    return getRoleFitController(authedReq.user!.id, url.searchParams);
  });
}
