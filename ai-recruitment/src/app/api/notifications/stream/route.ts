/**
 * GET /api/notifications/stream
 *
 * Server-Sent Events (SSE) endpoint that streams real-time notifications
 * to connected clients.  Subscribes to the Redis pub/sub channel
 * `user_{safeUserId}_notifications` and forwards events.
 *
 * Usage in frontend:
 *   const es = new EventSource('/api/notifications/stream');
 *   es.addEventListener('notification', (e) => { ... });
 */

import { type AuthenticatedRequest, withAuth } from '@/lib/auth-middleware';
import Redis from 'ioredis';
import { getBullConnectionOptions } from '@/lib/redis-options';
import { safeId } from '@/lib/utils/safeId';

// Heartbeat interval to keep the connection alive through proxies
const HEARTBEAT_INTERVAL_MS = 30_000;

export const dynamic = 'force-dynamic';

export async function GET(req: AuthenticatedRequest) {
  return withAuth(req, async (authedReq) => {
    const userId = authedReq.user!.id;

    // Create a dedicated subscriber connection (cannot be reused for other commands)
    const redisUrl = process.env.REDIS_URL;
    const opts     = redisUrl ? getBullConnectionOptions(redisUrl) : null;

    if (!opts) {
      return new Response('SSE unavailable: Redis not configured', { status: 503 });
    }

    const subscriber = new Redis({
      host:     opts.host,
      port:     opts.port,
      username: opts.username,
      password: opts.password,
      db:       opts.db,
      tls:      opts.tls ? {} : undefined,
      maxRetriesPerRequest: null,
    });

    let heartbeatTimer: ReturnType<typeof setInterval>;

    const stream = new ReadableStream({
      async start(controller) {
        const channel = `user_${safeId(userId)}_notifications`;

        const send = (event: string, data: string) => {
          try {
            controller.enqueue(`event: ${event}\ndata: ${data}\n\n`);
          } catch {
            // Controller may be closed
          }
        };

        // Send a connected event immediately
        send('connected', JSON.stringify({ userId }));

        // Subscribe to Redis channel
        await subscriber.subscribe(channel);

        subscriber.on('message', (_ch: string, message: string) => {
          send('notification', message);
        });

        // Heartbeat to prevent proxy timeouts
        heartbeatTimer = setInterval(() => {
          try {
            controller.enqueue(': heartbeat\n\n');
          } catch {
            clearInterval(heartbeatTimer);
          }
        }, HEARTBEAT_INTERVAL_MS);

        // Clean up when request is aborted
        req.signal?.addEventListener('abort', () => {
          clearInterval(heartbeatTimer);
          void subscriber.unsubscribe(channel).then(() => subscriber.disconnect());
          controller.close();
        });
      },

      cancel() {
        clearInterval(heartbeatTimer);
        void subscriber.disconnect();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type':                'text/event-stream',
        'Cache-Control':               'no-cache, no-transform',
        'Connection':                  'keep-alive',
        'X-Accel-Buffering':           'no',   // Nginx no-buffer
        'Access-Control-Allow-Origin': '*',
      },
    });
  });
}
