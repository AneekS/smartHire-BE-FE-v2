# SmartHire AI Documentation Index

Generated from a codebase and live InsForge audit on April 29, 2026.

This documentation covers the Next.js application under `ai-recruitment`, its API routes, Prisma schema, InsForge backend usage, authentication model, environment variables, and the highest-risk engineering gaps found during the audit.

## Documentation Map

| Document | Purpose |
| --- | --- |
| [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | Product summary, stack, implemented capabilities, verification results, and audit highlights. |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, data-flow diagrams, backend split analysis, scalability and security decisions. |
| [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md) | Repository layout, folder responsibilities, generated artifacts, and cleanup targets. |
| [FRONTEND.md](./FRONTEND.md) | App routes, component architecture, state/data fetching, UX notes, and frontend risks. |
| [BACKEND.md](./BACKEND.md) | Route-handler architecture, services, workers, AI, caching, file handling, and backend risks. |
| [API_REFERENCE.md](./API_REFERENCE.md) | API endpoint inventory with methods, auth expectations, data source, and status notes. |
| [DATABASE.md](./DATABASE.md) | Prisma schema, live InsForge schema, table groups, missing tables, migrations, and RLS findings. |
| [AUTHENTICATION.md](./AUTHENTICATION.md) | InsForge auth, legacy NextAuth, middleware behavior, role model, and auth hardening plan. |
| [ENV_VARIABLES.md](./ENV_VARIABLES.md) | Environment variable inventory, required secrets, local findings, and deployment notes. |

## Executive Findings

| Severity | Finding | Evidence | Recommended Action |
| --- | --- | --- | --- |
| Critical | The app has two incompatible backend models in active use. | Prisma uses quoted CamelCase tables such as `User`, `Candidate`, and `ResumeVersion`; several InsForge SDK routes call snake-case tables such as `profiles`, `resume_versions`, `resumes`, `parsed_resumes`, and `candidates`. The live InsForge database does not contain several of those snake-case tables. | Choose one canonical application data model. Prefer Prisma/CamelCase for server-owned app tables, then migrate or delete legacy SDK routes that target absent tables. |
| Critical | Live InsForge database has no RLS policies. | `npx -y @insforge/cli db policies --json` returned `{"policies":[]}`. | Add table-level RLS policies before exposing any browser/client database access. Treat current data isolation as app-layer only. |
| Critical | Authentication is split between InsForge and legacy NextAuth. | UI sign-in/sign-up routes use InsForge. `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/auth.ts`, and NextAuth Prisma tables still exist. | Standardize on InsForge auth, retire NextAuth endpoints/tables, or formally document a migration bridge. |
| High | Some production routes target tables that do not exist live. | Live checks found `profiles`, `resume_versions`, `resumes`, `parsed_resumes`, `ats_scores`, `resume_suggestions`, and `candidates` absent. Routes and services still call them. | Disable or rewrite the broken routes before release. Add an API/database smoke test that checks referenced tables. |
| High | API middleware does not protect `/api`. | `src/middleware.ts` excludes API routes in the matcher and lists `/api` as public. | Keep public endpoints explicit and require route-level auth everywhere else. Add tests for unauthenticated requests. |
| High | User uploads are stored under `public/uploads`. | `src/app/api/v1/resumes/upload/route.ts` writes resume files to `public/uploads/resumes`; avatar/resume artifacts exist under `public/uploads`. | Move uploads to private InsForge storage buckets (`resumes`, `avatars`, `parsed-data`) and remove user files from public/static paths. |
| High | Lint currently fails. | `npm run lint` reported 18 errors and 41 warnings. | Fix React hook lint errors, `any` usage, unused route function, and checked-in CommonJS test scripts. |
| Medium | Tests pass but coverage is narrow and leaks Redis connection attempts. | `npm run test -- --run` passed 31 tests, but recommendation tests attempted Redis connections and only cover limited service utilities. | Mock Redis at the module boundary and add API/auth/resume/interview integration tests. |
| Medium | Tailwind version conflicts with repo instruction. | `package.json` uses Tailwind 4 (`tailwindcss` and `@tailwindcss/postcss`), while repo instructions require Tailwind CSS 3.4 locked. | Either downgrade and lock Tailwind 3.4 or update the project instruction if Tailwind 4 is intentional. |
| Medium | Dependency freshness needs planned upgrades. | `npm outdated --json` found outdated packages including `@insforge/sdk`, Prisma, Next, React, AI SDK, BullMQ, OpenAI, Redis, and Vitest. | Upgrade in small batches with smoke tests, prioritizing InsForge SDK and Prisma compatibility. |

## Audit Numbers

| Metric | Value |
| --- | ---: |
| `src` files | 258 |
| `src/app` files | 86 |
| `src/components` files | 91 |
| Services/repositories/workers files | 20 |
| API route files | 60 |
| Prisma migration SQL files | 6 |
| Live InsForge tables | 69 |
| Live InsForge RLS policies | 0 |
| Live InsForge functions | 0 |
| Live InsForge triggers | 0 |
| Vitest tests | 31 passing |
| ESLint result | Failing: 18 errors, 41 warnings |

## Resolved Audit Questions

| Hard Question | Answer From Codebase | Recommendation |
| --- | --- | --- |
| What is the real backend: InsForge SDK, Prisma, or both? | Both. Server routes use Prisma directly and InsForge SDK/PostgREST. The live database contains both Prisma CamelCase tables and newer snake-case feature tables. | Use Prisma for server-owned domain tables and InsForge for auth/storage/infra, unless a deliberate SDK-first migration is planned. |
| Is the app protected by middleware? | Pages are protected by InsForge middleware, but `/api` is excluded. API protection is per-route only. | Audit every API route and make auth intent explicit in code and tests. |
| Can a new signup create the necessary application records? | Not reliably. InsForge signup inserts into `candidates`, but the live backend has `Candidate`, not `candidates`; failure is logged and ignored. | Create or upsert the canonical Prisma `User` and `Candidate` rows after InsForge signup. Fail signup or surface partial-provisioning status if app records cannot be created. |
| Are resume uploads production safe? | No. One upload path writes to `public/uploads/resumes`, and another route builds `/uploads/<filename>` without persisting the file there. | Use private InsForge storage and store object metadata in `ResumeVersion` or a dedicated file table. |
| Is the interview feature durable? | Partly. Sessions/messages/feedback tables exist, but feedback generation is fire-and-forget and not queued. | Move feedback and per-answer analysis to BullMQ jobs with retry and status tracking. |
| Is the database access policy safe for client use? | No live RLS policies were found. | Do not allow direct browser database access until RLS exists. Keep server routes as the only database write surface. |

## Recommended Remediation Order

1. Freeze schema changes until backend ownership is decided.
2. Pick one canonical auth and user provisioning flow. Recommended: InsForge auth plus Prisma application records keyed by email and a stored InsForge auth user id.
3. Replace or remove routes that target absent tables.
4. Add RLS policies to live InsForge tables, especially user-owned tables and feature-cache tables.
5. Move user files from `public/uploads` to private InsForge storage.
6. Fix ESLint errors and add API smoke tests for auth, resume upload, ATS scoring, skills gap, and interviews.
7. Align Tailwind with the repo instruction and plan dependency upgrades.
8. Clean generated/debug artifacts and stale docs that describe abandoned architecture.

