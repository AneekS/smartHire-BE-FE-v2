# Folder Structure

The project is a Next.js App Router application with a large feature surface and several migration-era artifacts.

## Top-Level Layout

```text
ai-recruitment/
  .agents/                 Local skills and InsForge skill docs
  .insforge/               InsForge project link/config metadata
  docs/                    Project documentation and SQL notes
  prisma/                  Prisma schema and migrations
  public/                  Static assets and currently user-uploaded files
  scripts/                 Local utility scripts
  src/                     Application source
  package.json             Scripts and dependencies
  next.config.ts           Next.js configuration
  prisma.config.ts         Prisma CLI configuration
  vitest.config.ts         Vitest configuration
  eslint.config.mjs        ESLint configuration
  components.json          shadcn/ui-style configuration
```

## Source Layout

```text
src/
  app/
    (public)/              Landing page route group
    (auth)/                Login and register pages
    (dashboard)/           Authenticated product pages
    api/                   Next.js route handlers
    globals.css            Tailwind/global styles
    layout.tsx             Root layout and providers
  components/
    applications/          Application tracker UI
    integrations/          Integration UI
    interviews/            Mock interview UI
    job-ats/               ATS matching UI
    jobs/                  Job discovery UI
    layout/                App shell/sidebar/nav
    profile/               Profile editor sections
    providers/             React providers
    resume/                Resume optimizer UI
    sections/              Landing page sections
    skills/                Skill-gap UI
    ui/                    Reusable UI primitives
  hooks/                   SWR/custom hooks
  lib/                     Shared server/client utilities
  repositories/            Lower-level database repositories
  services/                Business services and tests
  store/                   Zustand stores
  types/                   Shared TypeScript types
  utils/                   Utility functions
  workers/                 BullMQ workers
```

## Important Folders

| Folder | Responsibility | Notes |
| --- | --- | --- |
| `src/app/(public)` | Public landing experience. | The root landing page is section-based. |
| `src/app/(auth)` | Login/register screens. | Uses InsForge v1 auth API routes, not NextAuth UI. |
| `src/app/(dashboard)` | Main app routes. | Contains dashboard, resume, jobs, job ATS, skills, applications, interviews, profile, integrations, roadmap. |
| `src/app/api` | Server route handlers. | Mixes Prisma, InsForge SDK, and legacy route handlers. |
| `src/components/ui` | Reusable UI primitives. | shadcn-style components. |
| `src/lib` | Shared utilities. | Contains auth, API client, Redis/cache, integrations, interview helpers, validators, and legacy/new resume services. |
| `src/services` | Business logic. | Applications, jobs, profile, recommendations, resume services. Some overlap with `src/lib/services`. |
| `src/repositories` | Persistence layer. | Applications and recommendations repositories. |
| `src/store` | Zustand stores. | Resume, skill-gap, and job ATS stores perform direct API calls. |
| `src/workers` | Background workers. | BullMQ consumers for recommendations, analytics, cache refresh, application tracking, and embeddings. |
| `prisma` | Prisma schema and migrations. | Local migrations are not tracked by InsForge CLI migrations. |
| `public/images` | Product images/screenshots. | Safe static assets. |
| `public/uploads` | User-uploaded avatars/resumes. | Privacy and deployment risk. Move to InsForge storage. |

## API Route Groups

| Group | Purpose |
| --- | --- |
| `src/app/api/auth` | Legacy NextAuth and custom InsForge auth bridge routes. |
| `src/app/api/v1/auth` | Active InsForge signin/signup routes used by UI. |
| `src/app/api/profile` | Profile section endpoints and a legacy broken root profile route. |
| `src/app/api/resume` | Legacy and Prisma-backed resume routes. Mixed status. |
| `src/app/api/v1/resumes` | v1 resume APIs using Prisma. |
| `src/app/api/jobs` | Prisma-backed job search/recommendation/saved/apply routes. |
| `src/app/api/v1/jobs` | InsForge-backed job listing/ATS routes plus legacy lower-case job routes. |
| `src/app/api/v1/applications` | Application tracker APIs. |
| `src/app/api/interviews` | InsForge-backed mock interview APIs. |
| `src/app/api/roadmap` | Career roadmap APIs. |
| `src/app/api/integrations` | OAuth provider connect/disconnect/callback routes. |

## Generated or Suspicious Artifacts

The following should be reviewed before committing or deploying:

| Path | Concern |
| --- | --- |
| `.next/` | Build output. Should not be committed. |
| `node_modules/` | Dependency install output. Should not be committed. |
| `public/uploads/avatars` | User-uploaded avatars in public static folder. |
| `public/uploads/resumes` | User-uploaded resumes in public static folder. |
| `curl_out.txt`, `curl_out2.txt` | Debug command output. |
| `lint-results.json`, `lint.txt` | Debug lint output. |
| `test-db-fk.js`, `test-db-user.js` | Root-level CommonJS scripts currently trigger ESLint errors. |
| `ai-recruitment@0.1.0`, `next`, `tsconfig.tsbuildinfo` | Generated or accidental artifacts, verify ignore status. |

## Prisma Folder

```text
prisma/
  schema.prisma
  migrations/
    0_init/
    202507020001_performance_optimizations/
    202507030001_gin_salary_indexes/
    20260312133900_performance_optimizations/
    20260312200000_add_job_recommendation_score/
    20260312210000_audit_schema_improvements/
    20260312220000_perf_indexes_and_pgvector/
```

The live database has a `_prisma_migrations` table, but `npx -y @insforge/cli db migrations list --json` returned no InsForge-managed migrations. Treat Prisma migrations and InsForge CLI migrations as separate systems unless deliberately unified.

## Maintainability Observations

| Observation | Impact |
| --- | --- |
| `src/lib/services` and `src/services/resume` both contain resume logic. | Two resume pipelines are easy to confuse and already target different tables. |
| `src/lib/api-client.ts` claims all frontend calls go through it, but hooks/stores call `fetch` directly. | Response-shape drift and duplicated error handling. |
| Route files frequently contain business logic inline. | Harder to test without full route-handler integration tests. |
| Several files log domain details directly. | Noisy production logs and potential PII leakage. |
| Generated/debug files are present in repo root. | DX clutter and lint/test interference. |

## Cleanup Recommendations

1. Move `public/uploads` content out of static assets and add ignore rules for future uploads.
2. Delete or quarantine legacy/broken route handlers after replacing them with canonical v1 APIs.
3. Merge duplicate resume service layers into one pipeline.
4. Move ad hoc root scripts into `scripts/` and exclude them from lint if they remain CommonJS.
5. Keep `docs/` current by adding an API/schema smoke-test output section during release.

