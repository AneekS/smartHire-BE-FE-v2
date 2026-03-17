# SmartHire AI — Project Memory

## Project Overview
- **Location**: `c:\Users\ANURON\smartHire-BE-FE-v2\ai-recruitment\`
- **Stack**: Next.js 15/16 fullstack (App Router), TypeScript, TailwindCSS, shadcn/ui
- **Database**: PostgreSQL via Prisma ORM (`@prisma/adapter-pg` with pg Pool)
- **Auth**: InsForge BaaS + NextAuth (`@insforge/nextjs`, `@insforge/sdk`)
- **Queue**: BullMQ + ioredis (Redis)
- **Email**: Resend (`resend` package, already installed)
- **AI**: OpenAI (`openai` package), also `@ai-sdk/openai`
- **Real-time**: InsForge WebSocket (BaaS) + custom SSE endpoint built for notifications

## Key Architecture Notes
- **Not** a traditional Express backend — this is a Next.js App Router project
- `src/app/api/` are Next.js route handlers (not Express routes)
- Auth via `withAuth(req, handler)` from `@/lib/auth-middleware` — uses InsForge `requireAuth()`
- Error handling via `handleError(error)` from `@/lib/errors`
- DB singleton: `import { prisma } from '@/lib/db'`
- Redis singleton: `import { redis } from '@/lib/redis'`
- Queue pattern: lazy singletons in `@/lib/queues.ts`, producers in `@/services/queue-producers.ts`
- Workers run via `npx tsx src/workers/*.worker.ts` (see package.json scripts)

## Notification System (implemented on branch: inapp-emailnotification)

### Files Created
- `prisma/schema.prisma` — extended with new enums (NotificationPriority, NotificationCategory, NotificationChannel, DeliveryStatus) and models (NotificationPreference, NotificationDeliveryLog). Notification model extended with category/priority/deliveryChannel/deliveryLogs fields.
- `src/modules/notifications/events/notification.events.ts` — event types union + `publishNotificationEvent()` publisher
- `src/modules/notifications/services/aiNotification.service.ts` — AI-generated titles/messages via GPT-4o-mini with extensive static fallback templates
- `src/modules/notifications/services/notification.service.ts` — createNotification, listNotifications, markAsRead, markAllAsRead, getOrCreatePreferences, updatePreferences + Redis pub/sub push
- `src/modules/notifications/services/email.service.ts` — Resend integration with HTML template rendering
- `src/modules/notifications/templates/` — 4 email templates: defaultEmail.html, jobAlertEmail.html, interviewEmail.html, shortlistEmail.html, offerEmail.html
- `src/workers/notification.worker.ts` — BullMQ consumer for `notification-events` queue
- `src/workers/email.worker.ts` — BullMQ consumer for `email-events` queue
- `src/app/api/notifications/route.ts` — GET list + POST mark-all-read
- `src/app/api/notifications/[id]/route.ts` — PATCH mark single as read
- `src/app/api/notifications/preferences/route.ts` — GET/PUT preferences
- `src/app/api/notifications/stream/route.ts` — SSE real-time endpoint (Redis pub/sub subscriber)
- `src/hooks/useNotifications.ts` — `useNotifications()` + `useNotificationPreferences()` SWR hooks
- `src/components/notifications/notification-utils.ts` — shared `cn()` + `formatDistanceToNowSafe()`
- `src/components/notifications/NotificationBell.tsx` — bell icon with unread badge + dropdown toggle
- `src/components/notifications/NotificationDropdown.tsx` — dropdown with recent notifications
- `src/app/(dashboard)/notifications/page.tsx` — full notification center page
- `src/app/(dashboard)/notifications/preferences/page.tsx` — preferences page with toggles

### Files Modified
- `src/lib/queues.ts` — added `NOTIFICATIONS` and `EMAILS` queue names + getters
- `src/components/layout/Sidebar.tsx` — added NotificationBell + Notifications nav item
- `ai-recruitment/package.json` — added `worker:notifications` and `worker:emails` scripts

### Queue Names
- `notification-events` — notification processing queue
- `email-events` — email delivery queue

### Event Flow
1. `publishNotificationEvent(event)` → `notification-events` queue
2. `notification.worker.ts` consumes → calls `generateNotificationContent()` (AI + fallback)
3. → `createNotification()` → DB + Redis pub/sub publish → email queue if needed
4. `email.worker.ts` consumes `email-events` → Resend API → `NotificationDeliveryLog`
5. Frontend SSE `/api/notifications/stream` subscribes to Redis channel `user:{userId}:notifications`

### Priority Map
- HIGH: INTERVIEW_SCHEDULED, INTERVIEW_RESCHEDULED, OFFER_RECEIVED, OFFER_DEADLINE, CANDIDATE_SHORTLISTED, ASSESSMENT_DUE
- MEDIUM: JOB_MATCH_FOUND, PROFILE_VIEWED, APPLICATION_STATUS_UPDATED, SKILL_GAP_DETECTED, etc.
- LOW: LEARNING_RECOMMENDATION, RESUME_IMPROVEMENT, PROFILE_INCOMPLETE, INACTIVE_REMINDER, etc.

### Worker Scripts
```bash
npm run worker:notifications  # notification.worker.ts
npm run worker:emails         # email.worker.ts
```

### Env Vars Used
- `REDIS_URL` — required for all workers
- `OPENAI_API_KEY` — optional (falls back to static templates)
- `REDIS_URL=redis://localhost:6379` — required for queues + SSE pub/sub
- `RESEND_API_KEY=re_FfCFpWA7_Ec4KMima8Nze6c3FdcAiy1WF` — email delivery
- `RESEND_DOMAIN=mail.smarthireai.app` — email sender domain
- `NEXT_PUBLIC_APP_URL=https://smarthireai.app` — CTA links in emails / notification routes

### AI Provider: Insforge (NOT OpenAI)
- `aiNotification.service.ts` uses the **Insforge AI API** (OpenAI-compatible endpoint)
- Client is built with `createClient({ baseUrl, anonKey })` from `@insforge/sdk` → type `InsForgeClient` (capital F)
- Call: `client.ai.chat.completions.create({ model: 'openai/gpt-4o-mini', maxTokens: 200, ... })` — note `maxTokens` (camelCase, not `max_tokens`)
- API key is reused from `NEXT_PUBLIC_INSFORGE_ANON_KEY` — anon key does NOT have AI access; returns 401 → fallback templates used
- `OPENAI_API_KEY` must NOT appear in env (project policy)

### Email sender format
```
SmartHire <notifications@mail.smarthireai.app>
```

### Migration history (8 migrations as of 2026-03-14)
- Latest: `20260314000000_add_notification_category_priority`
  - Adds category/priority/deliveryChannel columns to Notification
  - Creates NotificationPreference, NotificationDeliveryLog tables
  - Adds NotificationPriority, NotificationCategory, NotificationChannel, DeliveryStatus enums
  - Added 26 new NotificationType values
  - Pre-applied via `prisma db push`; marked applied with `prisma migrate resolve --applied`
- DB is in sync: `prisma migrate status` → "Database schema is up to date!" (8 migrations)

### To apply DB changes
```bash
# Standard workflow:
cd ai-recruitment && npx prisma migrate dev --name <migration_name>
npx prisma generate

# If prisma db push was used first (drift scenario):
# 1. Create migration SQL manually in prisma/migrations/<timestamp>_<name>/migration.sql
# 2. npx prisma migrate resolve --applied <timestamp>_<name>
# 3. npx prisma generate
```

## Coding Patterns
- Route handlers: `export async function GET(req: AuthenticatedRequest) { return withAuth(req, async (authedReq) => { ... }); }`
- Params in route handler: `{ params }: { params: Promise<{ id: string }> }` → `const { id } = await params`
- Error handling: wrap entire handler body in `try/catch { return handleError(error); }`
- Zod validation: `Schema.parse(body)` — throws ZodError which `handleError` handles
- Services: plain async functions, not classes
- Workers: `Worker` from bullmq, processes job by `job.name` string matching

## shadcn UI Components Available
avatar, badge, button, card, checkbox, dialog, form, input, label, progress, select, separator, sheet, skeleton, sonner, switch, tabs, textarea
