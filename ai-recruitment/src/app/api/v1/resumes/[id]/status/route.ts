import { prisma } from "@/lib/db";
import {
  withAuth,
  AuthenticatedRequest,
} from "@/lib/auth-middleware";

const TERMINAL_STATUSES = new Set(["COMPLETE", "FAILED"]);
const POLL_INTERVAL_MS = 2000;

export async function GET(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (authedReq) => {
    const { id: resumeId } = await params;
    const accept = req.headers.get("accept") ?? "";

    const version = await prisma.resumeVersion.findFirst({
      where: { id: resumeId, userId: authedReq.user!.id },
    });

    if (!version) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!accept.includes("text/event-stream")) {
      return new Response(
        JSON.stringify({
          resumeId: version.id,
          status: version.pipelineStatus,
          atsScore: version.atsScore,
          updatedAt: version.updatedAt.toISOString(),
          pipelineError: version.pipelineError,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    let closed = false;

    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: Record<string, unknown>) => {
          if (closed) return;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        };

        req.signal.addEventListener("abort", () => {
          closed = true;
          controller.close();
        });

        while (!closed) {
          const current = await prisma.resumeVersion.findFirst({
            where: { id: resumeId, userId: authedReq.user!.id },
          });

          if (!current) {
            send({ resumeId, status: "FAILED", error: "Not found" });
            controller.close();
            return;
          }

          send({
            resumeId: current.id,
            status: current.pipelineStatus,
            atsScore: current.atsScore,
            updatedAt: current.updatedAt.toISOString(),
            pipelineError: current.pipelineError,
          });

          if (TERMINAL_STATUSES.has(current.pipelineStatus)) {
            controller.close();
            return;
          }

          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  });
}
