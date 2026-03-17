import { withRole, type AuthenticatedRequest } from "@/lib/auth-middleware";
import { recruiterFilterController } from "@/modules/preferences/controllers/preferences.controller";

export async function POST(req: AuthenticatedRequest) {
  return withRole(req, "RECRUITER", async () => {
    const body = await req.json();
    return recruiterFilterController(body);
  });
}
