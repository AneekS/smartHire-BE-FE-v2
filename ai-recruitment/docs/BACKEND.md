# Backend

The backend is implemented as Next.js route handlers under `src/app/api`, with a mix of Prisma repositories/services, InsForge SDK calls, Redis cache utilities, BullMQ workers, and AI services.

## Backend Layers

| Layer | Source | Responsibility |
| --- | --- | --- |
| Route handlers | `src/app/api/**/route.ts` | HTTP interface, auth checks, validation, response formatting. |
| Auth wrappers | `src/lib/insforge-server.ts`, `src/lib/auth-middleware.ts`, `src/lib/auth-helpers.ts` | Resolve InsForge sessions and attach user context. |
| Prisma client | `src/lib/db.ts` | ORM access to PostgreSQL. |
| Repositories | `src/repositories/**` | Lower-level persistence for applications and recommendations. |
| Services | `src/services/**`, `src/lib/services/**` | Business logic for resume parsing, recommendations, profile, applications, queues. |
| InsForge SDK | `src/lib/insforge.ts`, direct `createClient` calls | Auth, PostgREST-style database access, storage/API bridge. |
| Cache/queues | `src/lib/cache.ts`, `src/lib/redis.ts`, `src/lib/queues.ts` | Redis cache and BullMQ queue registry. |
| Workers | `src/workers/**` | Background job processors. |

## Route Handler Patterns

The codebase uses several route styles:

| Pattern | Example | Notes |
| --- | --- | --- |
| `withAuth(req, handler)` | `src/app/api/profile/skills/route.ts` | Attaches InsForge user metadata to `req.user`. |
| `withAuth()` helper returning `dbUser` | v1 application/job routes | Combines InsForge session with Prisma `User` lookup by email. |
| Direct `requireAuth()` | Some resume/profile routes | Throws generic `Unauthorized`. |
| Public route | `/api/v1/jobs/listings`, `/api/health/recommendations` | Should be explicitly marked public. |
| Legacy NextAuth route | `/api/auth/[...nextauth]`, `/api/auth/register` | Coexists with InsForge auth and should be retired or isolated. |
| Direct InsForge SDK route | legacy resume/profile and interview routes | Several use table strings that are absent or need RLS review. |

## Authentication and Authorization

Server-side InsForge auth is provided by:

- `src/lib/insforge-server.ts`
- `src/lib/auth-middleware.ts`
- `src/lib/auth-helpers.ts`

Risks:

- `src/middleware.ts` excludes all `/api` routes.
- Role is read from InsForge `user_metadata.role`, defaulting to `CANDIDATE`.
- `withRole` uses exact string equality and has no role hierarchy.
- `auth-helpers.ts` requires a matching Prisma `User` row by email; signup currently does not reliably create that row.

## Database Access

### Prisma

Prisma is used heavily for:

- Users and candidates
- Resume versions
- Jobs and applications
- Profile sections
- Recommendation scores and behavior events
- Notifications and roadmap data

### InsForge SDK/PostgREST

InsForge SDK is used for:

- Auth signin/signup
- Interview tables
- Job ATS and skill gap feature tables
- Some legacy resume/profile routes

The dangerous part is not the SDK itself. The dangerous part is inconsistent table naming and missing RLS policies.

## Resume Backend

There are at least two resume pipelines:

| Pipeline | Files | Tables | Status |
| --- | --- | --- | --- |
| Prisma/v1 pipeline | `src/app/api/v1/resumes/*`, `src/app/api/resume/route.ts`, `src/lib/services/*` | `ResumeVersion`, `Candidate`, related Prisma tables | More aligned with live Prisma schema, but has file-storage and status issues. |
| Legacy InsForge SDK pipeline | `src/app/api/resume/upload`, `src/app/api/resume/analyze`, `src/services/resume/*` | `resume_versions`, `resumes`, `parsed_resumes`, `ats_scores`, `resume_suggestions` | Broken against live backend because those tables are absent. |

Specific findings:

- `src/app/api/v1/resumes/upload/route.ts` writes uploaded files to `public/uploads/resumes`.
- `src/app/api/resume/route.ts` creates a `fileUrl` like `/uploads/<filename>` but does not persist the uploaded file in that route.
- Resume scoring includes a random ATS score in one flow.
- Parser services log parsed content/project details.
- `ResumeRaw` exists in Prisma, but current upload/analyze flows do not consistently populate it.

## Job and ATS Backend

The app has two job concepts:

- Prisma `Job` for application/recommendation flows.
- InsForge `job_listings` for the job ATS feature.

The `job_listings`, `job_ats_scores`, and `skill_gaps` tables exist live. The legacy InsForge routes that query lower-case `jobs` likely do not align with the Prisma `Job` table.

ATS scoring:

- Computes or reads cached rows in `job_ats_scores`.
- Uses a job description hash for cache behavior.
- Depends on latest parsed resume content from Prisma.
- May have weak source text if `ResumeRaw` is not populated.

## Skill Gap Backend

`src/app/api/v1/skills/gap-analysis/route.ts`:

- Reads job listing context from `job_listings`.
- Reads cached rows from `skill_gaps`.
- Generates AI-backed analysis and roadmap data.
- Stores history in `skill_gaps`.

Risks:

- Large route file with many responsibilities.
- Uses direct InsForge client and manual auth/session logic.
- Cache invalidation and history semantics are not documented in code.

## Interview Backend

Interview routes use live InsForge tables:

- `interview_sessions`
- `interview_messages`
- `interview_feedback`
- `interview_evaluations`
- `question_bank`

Flow:

1. Create/list sessions through `/api/interviews`.
2. Load session/messages through `/api/interviews/[id]`.
3. Send user response through `/api/interviews/[id]/message`.
4. Generate next AI message and async response analysis.
5. End session through `/api/interviews/[id]/end`.
6. Generate feedback through fire-and-forget promise.
7. Fetch feedback through `/api/interviews/[id]/feedback`.

Risks:

- Feedback generation is not queued or retried.
- Per-answer analysis is fire-and-forget.
- Completion logic can still generate another AI response after reaching the nominal question count.
- Personalization depends on mapping InsForge user id to Prisma profile/candidate data, which may not match.

## Background Jobs

| Worker | Source | Purpose |
| --- | --- | --- |
| Embeddings | `src/workers/embedding.worker.ts` | Resume/job embedding generation. |
| Recommendations | `src/workers/recommendationWorker.ts` | Precompute job recommendation scores. |
| Analytics | `src/workers/analyticsWorker.ts` | Aggregate candidate application analytics. |
| Cache | `src/workers/cacheWorker.ts` | Cache invalidation/refresh. |
| Application tracker | `src/workers/application-tracker.worker.ts` | Application tracker background updates. |

Queue producers are in `src/services/queue-producers.ts`.

Queue names are registered in `src/lib/queues.ts`:

- `recommendation-scores`
- `candidate-analytics`
- `cache-refresh`
- `recommendation-embedding-jobs`

Redis requirements:

- BullMQ queues require `REDIS_URL`.
- `src/lib/redis.ts` falls back to `REDIS_HOST` and `REDIS_PORT`, defaulting to `127.0.0.1:6379`.
- Tests currently attempt Redis connections when not fully mocked.

## AI Integration

AI appears in:

- Resume parsing and improvement generation.
- ATS scoring.
- Skill gap analysis.
- Interview question/response generation.
- Interview feedback.
- Recommendations/embeddings.

Recommendations:

- Centralize model configuration and timeouts.
- Add rate limiting per user and per route.
- Persist AI job status for long tasks.
- Validate all AI JSON responses with Zod before saving.
- Avoid logging raw resume/interview content.

## Error Handling

The codebase has:

- `src/lib/errors.ts` for Prisma and generic errors.
- `ok/err` response helpers in some services.
- Many ad hoc `try/catch` blocks.
- Some swallowed errors, especially provisioning and background work.

Recommended target:

- Use one response envelope for APIs.
- Never swallow failed provisioning of core user records.
- Convert expected validation errors into structured 400 responses.
- Convert missing auth to 401 and missing authorization to 403 consistently.

## Backend Test Coverage

Current passing tests:

- `src/services/applications/application.service.test.ts`
- `src/services/recommendations/job-recommendation.service.test.ts`
- `src/utils/recommendations/embedding.test.ts`
- `src/utils/recommendations/scoring.test.ts`

Gaps:

- API route tests.
- Auth and signup provisioning tests.
- Resume upload/parse/score integration tests.
- InsForge table contract tests.
- Interview completion/feedback tests.
- RLS/policy tests.

## Backend Recommendations

1. Delete or rewrite routes that call absent tables.
2. Add a table-contract test that extracts all `.from("table")` calls and validates them against live metadata or a checked-in schema manifest.
3. Move uploads to InsForge storage and remove public user files.
4. Make signup provisioning transactional and required.
5. Queue all slow AI jobs.
6. Add structured logs without raw PII.
7. Add route-level auth tests because middleware does not protect `/api`.

