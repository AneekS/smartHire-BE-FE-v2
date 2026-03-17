import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withRequestId } from "@/lib/middleware/requestId";

export async function GET(req: Request) {
  const requestId = withRequestId(req);

  try {
    const count = await prisma.user.count();

    return NextResponse.json({
      status: "ok",
      users: count,
      requestId,
    });
  } catch (error) {
    console.error(`[${requestId}] [HEALTH][USER_SYNC]`, error);
    return NextResponse.json(
      {
        status: "error",
        users: 0,
        requestId,
      },
      { status: 500 },
    );
  }
}
