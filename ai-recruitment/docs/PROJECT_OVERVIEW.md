# Project Overview

SmartHire AI is a Next.js application for engineering candidates, focused on resume optimization, job discovery, ATS matching, skill-gap analysis, career roadmaps, application tracking, integrations, and AI mock interviews.

The app is currently in a mixed implementation state: the UI surface is broad and polished, but the backend is split between Prisma-managed application tables and InsForge SDK/PostgREST routes. Several legacy or migration-era endpoints still reference tables that are not present in the live InsForge backend.

## Product Scope

| Area | Current Capability | Status |
| --- | --- | --- |
| Public marketing | Landing page sections and auth entry points. | Implemented. |
| Candidate dashboard | KPI cards, recommendations, job stats, profile prompts. | Partly real, partly static/demo data. |
| Resume optimizer | Upload, parse, score, improvements, score views. | Split between Prisma routes and legacy InsForge routes; some routes broken. |
| Job search | Search/listing UI, recommendations, saved jobs, alerts. | Prisma and InsForge feature tables both used. |
| Job ATS | Listing detail, cached ATS score, skill/keyword analysis. | Uses live `job_listings` and `job_ats_scores`; depends on parsed resume data quality. |
| Skill gap analysis | Resume-based and target-role analysis with cached history. | Uses live `skill_gaps`; depends on parsed resume and AI responses. |
| Application tracker | Applications, notes, reminders, analytics, recruiter activity. | Prisma-backed, with background analytics hooks. |
| Profile | Many editable sections, privacy, avatar, integrations, AI insights. | Mostly Prisma-backed; legacy `/api/profile` route is broken against live schema. |
| Integrations | OAuth URL/callback/disconnect flow for providers. | Implemented, needs security and provider-token review. |
| Mock interviews | Session setup, interview room, AI interviewer, feedback. | Implemented with InsForge tables; background feedback is not durable. |

## Technology Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19, shadcn-style components, Tailwind CSS, Framer Motion, Lucide icons |
| Auth | InsForge auth via `@insforge/nextjs`; legacy NextAuth still present |
| Database | PostgreSQL on InsForge, Prisma ORM, InsForge SDK/PostgREST |
| Storage | InsForge buckets exist, but some current routes write to `public/uploads` |
| AI | Vercel AI SDK, OpenAI SDK, InsForge AI metadata |
| Background jobs | BullMQ workers with Redis |
| State/data | SWR, Zustand, custom API client |
| Validation | Zod |
| Testing | Vitest |
| Linting | ESLint with Next config |

## Live InsForge Backend Snapshot

From `npx -y @insforge/cli current` and metadata/database CLI checks:

| Item | Value |
| --- | --- |
| Project | `smart-hire-v2` |
| Project ID | `ff3b0aca-bedf-48a5-9d95-a10475773ed8` |
| App key | `2674danq` |
| Region | `ap-southeast` |
| Base URL | `https://2674danq.ap-southeast.insforge.app` |
| OAuth providers enabled | Discord, GitHub, Google, LinkedIn |
| Email verification | Required |
| Storage buckets | `avatars`, `parsed-data`, `resumes` |
| Edge/serverless functions | None |
| Database tables | 69 |
| RLS policies | 0 |
| Database triggers/functions | 0 |

## Verification Results

| Command | Result | Notes |
| --- | --- | --- |
| `npm run test -- --run` | Passed | 31 tests passed across 4 files. Recommendation tests attempted Redis connections before falling back. |
| `npm run lint` | Failed | 18 errors and 41 warnings. Most severe errors are React hook purity/set-state rules, explicit `any`, and a non-exported/unused auth route function. |
| `npm outdated --json` | Completed with network approval | Outdated packages include `@insforge/sdk`, Prisma, Next, React, AI SDK, BullMQ, OpenAI, Redis, Vitest, and others. |
| InsForge CLI schema checks | Completed | Confirmed absent referenced tables and no RLS policies. |

## Dependency Audit

Notable outdated packages from `npm outdated --json`:

| Package | Current | Latest | Note |
| --- | --- | --- | --- |
| `@insforge/sdk` | `1.1.6-dev.0` | `1.2.5` | High priority because this project depends on InsForge auth/database behavior. |
| `@prisma/client`, `prisma`, `@prisma/adapter-pg` | `7.4.2` | `7.8.0` | Upgrade as a matched Prisma batch. |
| `next` | `16.1.6` | `16.2.4` | Keep aligned with `eslint-config-next`. |
| `react`, `react-dom` | `19.2.3` | `19.2.5` | Patch update. |
| `ai` | `6.0.105` | `6.0.168` | AI SDK surface should be regression-tested. |
| `@ai-sdk/openai` | `3.0.37` | `3.0.53` | Upgrade with `ai`. |
| `openai` | `6.25.0` | `6.35.0` | Check parser/interview service compatibility. |
| `bullmq` | `5.71.0` | `5.76.3` | Queue behavior should be smoke-tested. |
| `redis` | `5.11.0` | `5.12.1` | Appears unused in source; `ioredis` is the actual imported Redis client. |
| `vitest`, `@vitest/coverage-v8` | `3.2.4` | `4.1.5` | Major upgrade; defer until test suite is stable. |
| `tailwindcss`, `@tailwindcss/postcss` | `4.2.1` | `4.2.4` | Conflicts with repo instruction requiring Tailwind CSS 3.4. |

Potentially redundant or legacy dependencies:

| Package | Reason To Review |
| --- | --- |
| `next-auth`, `@auth/prisma-adapter`, `bcryptjs`, `@types/bcryptjs` | Only needed for legacy NextAuth/password flow. Remove if InsForge is canonical. |
| `redis` | No source imports found; `ioredis` is used in `src/lib/redis.ts`. |
| `uploadthing`, `@uploadthing/react` | Present in `package.json`, no source imports found. InsForge storage is the intended backend. |
| `resend` | Present in `package.json`, no source imports found. |
| `@react-pdf/renderer` | Present in `package.json`, no source imports found. |

## Current Reality: What Is Solid vs Fragile

### Solid

- Next.js App Router structure is well separated into public, auth, dashboard, and API areas.
- Prisma schema is substantial and covers users, candidates, resumes, jobs, applications, recommendations, profile sections, notifications, and roadmap data.
- Live InsForge contains the newer job ATS, skill gap, and interview tables used by several v1 features.
- SWR and service/repository patterns exist for several feature areas.
- BullMQ queues and workers are present for recommendations, analytics, cache refresh, application tracking, and embeddings.

### Fragile

- There is no single source of truth for backend data access.
- New InsForge signups can create auth users without creating canonical application records.
- Several API routes reference absent tables.
- User files are stored in public static paths in at least one upload flow.
- Live database has no RLS policies.
- Lint currently fails and coverage is narrow.
- Some UI pages use static/demo values, so product completeness is uneven.

## Key Source Anchors

| Concern | Source |
| --- | --- |
| InsForge browser client | `src/lib/insforge.ts` |
| InsForge server auth client | `src/lib/insforge-server.ts` |
| API auth wrapper | `src/lib/auth-middleware.ts`, `src/lib/auth-helpers.ts` |
| Legacy NextAuth | `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts` |
| Prisma schema | `prisma/schema.prisma` |
| API route handlers | `src/app/api/**/route.ts` |
| Central API client | `src/lib/api-client.ts` |
| Redis/cache | `src/lib/redis.ts`, `src/lib/cache.ts`, `src/lib/queues.ts` |
| Workers | `src/workers/*` |
| Resume services | `src/lib/services/*`, `src/services/resume/*` |
| Recommendation services | `src/services/recommendations/*`, `src/repositories/recommendations/*` |

## Actionable Product Recommendations

1. Define the MVP boundary for candidate onboarding, resume upload, ATS scoring, skill gaps, and mock interview feedback. These should be made reliable before expanding roadmap or integrations.
2. Label demo/static dashboard sections in code or replace them with real aggregates from Prisma.
3. Convert resume parsing/scoring into a single pipeline with storage, parse, score, suggestions, and embeddings all writing to the same canonical tables.
4. Add a "backend contract" test that runs a table-existence check for every InsForge SDK `.from(...)` table used by the app.
5. Add a release checklist requiring lint, tests, auth smoke, table check, and storage smoke before deploy.
