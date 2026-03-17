import { withAuth, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { getSalaryInsightsController } from "@/modules/preferences/controllers/preferences.controller";

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    const url = new URL(authedReq.url);
    return getSalaryInsightsController(url.searchParams);
  });
}
