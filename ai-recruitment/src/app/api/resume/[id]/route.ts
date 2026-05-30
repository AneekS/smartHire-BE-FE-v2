import { NextRequest } from "next/server";
import {
  GET as v1Get,
  DELETE as v1Delete,
} from "@/app/api/v1/resumes/[id]/route";
import type { AuthenticatedRequest } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  return v1Get(req as AuthenticatedRequest, ctx);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  return v1Delete(req as AuthenticatedRequest, ctx);
}
