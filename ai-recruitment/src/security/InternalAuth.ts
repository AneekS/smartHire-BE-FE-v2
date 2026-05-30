import type { NextRequest } from "next/server";
import { ForbiddenError } from "@/auth/errors";

export class InternalAuth {
  static isInternalAuthorized(req: NextRequest): boolean {
    const secret = process.env.INTERNAL_DASHBOARD_SECRET;
    if (!secret) {
      return process.env.NODE_ENV !== "production";
    }

    const auth = req.headers.get("authorization");
    if (auth === `Bearer ${secret}`) return true;

    if (process.env.NODE_ENV !== "production") {
      const querySecret = req.nextUrl.searchParams.get("secret");
      if (querySecret === secret) return true;
    }

    return false;
  }

  static requireInternalAuth(req: NextRequest): void {
    if (!InternalAuth.isInternalAuthorized(req)) {
      throw new ForbiddenError("Unauthorized");
    }
  }
}
