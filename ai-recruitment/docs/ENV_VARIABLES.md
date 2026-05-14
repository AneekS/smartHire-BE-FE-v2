# Environment Variables

This inventory is based on `.env.local` variable names, `package.json`, and source-code references. Secret values are intentionally not documented.

## Variables Found In `.env.local`

Only these variable names were observed locally:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_INSFORGE_BASE_URL` | Public InsForge backend base URL. |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | Public anon key for the InsForge browser/client SDK. |
| `DATABASE_URL` | PostgreSQL connection string for Prisma. |

## Required Core Variables

| Variable | Required | Used By | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_INSFORGE_BASE_URL` | Yes | `src/lib/insforge.ts`, `src/lib/insforge-server.ts`, middleware, auth routes | Current code falls back to `https://2674danq.ap-southeast.insforge.app`, but production should not rely on hard-coded fallback. |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | Yes | `src/lib/insforge.ts` | Browser/client anon key. Safe to be public only if RLS policies are correct. Live RLS policies are currently absent. |
| `DATABASE_URL` | Yes | Prisma, workers, services | Required by `prisma.config.ts` and Prisma client. |

## Auth Variables

| Variable | Required | Used By | Notes |
| --- | --- | --- | --- |
| `NEXTAUTH_URL` | Legacy | NextAuth | Only needed if keeping legacy NextAuth. |
| `NEXTAUTH_SECRET` | Legacy | NextAuth | Only needed if keeping legacy NextAuth. |
| `GITHUB_CLIENT_ID` | Optional | OAuth/integrations or legacy auth | Source references provider OAuth credentials. |
| `GITHUB_CLIENT_SECRET` | Optional | OAuth/integrations or legacy auth | Secret. |
| `GOOGLE_CLIENT_ID` | Optional | OAuth/integrations | Provider credential. |
| `GOOGLE_CLIENT_SECRET` | Optional | OAuth/integrations | Secret. |
| `LINKEDIN_CLIENT_ID` | Optional | OAuth/integrations | Provider credential. |
| `LINKEDIN_CLIENT_SECRET` | Optional | OAuth/integrations | Secret. |

## Integration Variables

| Variable | Required | Used By | Notes |
| --- | --- | --- | --- |
| `HUBSPOT_CLIENT_ID` | Optional | Integrations | Needed only if HubSpot integration is enabled. |
| `HUBSPOT_CLIENT_SECRET` | Optional | Integrations | Secret. |
| `SLACK_CLIENT_ID` | Optional | Integrations | Needed only if Slack integration is enabled. |
| `SLACK_CLIENT_SECRET` | Optional | Integrations | Secret. |
| `ZOOM_CLIENT_ID` | Optional | Integrations | Needed only if Zoom integration is enabled. |
| `ZOOM_CLIENT_SECRET` | Optional | Integrations | Secret. |

## Redis and Queue Variables

| Variable | Required | Used By | Notes |
| --- | --- | --- | --- |
| `REDIS_URL` | Required for BullMQ workers | `src/lib/queues.ts`, workers | Queue registry returns `null` when absent. |
| `REDIS_HOST` | Optional local fallback | `src/lib/redis.ts` | Used when `REDIS_URL` is absent. Defaults to `127.0.0.1`. |
| `REDIS_PORT` | Optional local fallback | `src/lib/redis.ts` | Defaults to `6379`. |
| `CACHE_WORKER_CONCURRENCY` | Optional | `src/workers/cacheWorker.ts` | Worker concurrency override. |
| `APP_TRACKER_WORKER_CONCURRENCY` | Optional | `src/workers/application-tracker.worker.ts` | Worker concurrency override. |
| `ANALYTICS_WORKER_CONCURRENCY` | Optional | `src/workers/analyticsWorker.ts` | Worker concurrency override. |
| `EMBEDDING_WORKER_CONCURRENCY` | Optional | `src/workers/embedding.worker.ts` | Worker concurrency override. |
| `RECOMMENDATION_WORKER_CONCURRENCY` | Optional | `src/workers/recommendationWorker.ts` | Worker concurrency override. |

## AI Variables

The code uses AI SDK/OpenAI-style services. Confirm exact required variable names before deploy by inspecting model client initialization and deployment provider settings.

Common expected variables:

| Variable | Required | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | Likely | Needed if direct OpenAI SDK calls are used. |
| Provider-specific API keys | Maybe | Depends on final AI provider routing. |

InsForge metadata also lists available AI models, but code paths should still be checked for direct environment-based provider clients.

## Storage Variables

No additional storage env variables were found beyond InsForge base URL/key. The live backend has private buckets:

- `avatars`
- `parsed-data`
- `resumes`

Recommendation: route all uploads through InsForge storage and avoid writing user files to `public/uploads`.

## Deployment Notes

| Concern | Recommendation |
| --- | --- |
| Public anon key without RLS | Do not expose browser database writes/reads until RLS policies exist. |
| Hard-coded InsForge URL fallback | Keep env vars required in production and fail fast if missing. |
| Redis absent | App may partially work, but queues and cache behavior degrade. Make worker deploys require `REDIS_URL`. |
| Legacy NextAuth vars | Remove after retiring NextAuth. |
| Provider OAuth secrets | Store only in deployment secret manager, never in public env vars. |
| AI keys | Add rate limits and usage monitoring before production exposure. |

## Recommended `.env.example`

```bash
NEXT_PUBLIC_INSFORGE_BASE_URL=
NEXT_PUBLIC_INSFORGE_ANON_KEY=
DATABASE_URL=

# Redis / BullMQ
REDIS_URL=
REDIS_HOST=
REDIS_PORT=
CACHE_WORKER_CONCURRENCY=
APP_TRACKER_WORKER_CONCURRENCY=
ANALYTICS_WORKER_CONCURRENCY=
EMBEDDING_WORKER_CONCURRENCY=
RECOMMENDATION_WORKER_CONCURRENCY=

# Legacy NextAuth only if retained
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# OAuth integrations
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=

# AI providers
OPENAI_API_KEY=
```

## Environment Recommendations

1. Add `.env.example` with required vs optional groups.
2. Remove hard-coded production fallbacks from server code after deployment config is stable.
3. Make app startup fail clearly when required env vars are missing.
4. Keep `NEXT_PUBLIC_INSFORGE_ANON_KEY` safe by adding RLS policies before client database access.
5. Separate local, preview, and production env var sets.

