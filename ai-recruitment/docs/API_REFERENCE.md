# API Reference

This inventory is generated from `src/app/api/**/route.ts` inspection. API protection is route-level because `src/middleware.ts` excludes `/api`.

Status labels:

- `OK`: Route is structurally aligned with live tables or Prisma schema.
- `Risk`: Route may work, but has security, consistency, or durability concerns.
- `Broken`: Route references tables that were not found in the live InsForge database or has an implementation defect.
- `Legacy`: Route belongs to the old architecture and should be retired or formally isolated.
- `Unknown`: Not enough code-level evidence was inspected to assert runtime health.

## Auth

| Endpoint | Methods | Auth | Data Source | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `/api/auth/[...nextauth]` | GET, POST | Public/session | NextAuth + Prisma | Legacy | Coexists with InsForge auth. |
| `/api/auth/register` | POST | Public | Prisma `User` | Legacy | Creates bcrypt password users for NextAuth-style auth. |
| `/api/auth` | GET, DELETE | InsForge default handlers | InsForge | Risk | Local `POST` function exists but is not exported; lint flags it as unused. |
| `/api/v1/auth/signin` | POST | Public | InsForge auth | OK | Sign-in with email/password and syncs InsForge token via default handlers. |
| `/api/v1/auth/signup` | POST | Public | InsForge auth + `candidates` | Broken | Inserts into `candidates`, but live table is `Candidate`; failure is logged and ignored. |

## Health

| Endpoint | Methods | Auth | Data Source | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `/api/health/recommendations` | GET | Public | Recommendation/cache health | Risk | Useful for ops, but check whether details should be public. |

## Profile

| Endpoint | Methods | Auth | Data Source | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `/api/profile` | GET, PATCH | InsForge direct | `profiles` | Broken | Live `profiles` table was not found. |
| `/api/profile/avatar` | POST, DELETE | `withAuth` | Prisma/profile storage path | Risk | Check storage destination and public URL behavior. |
| `/api/profile/career-preferences` | GET, PUT | `withAuth` | Prisma profile service | OK | Candidate-owned profile section. |
| `/api/profile/certifications` | GET, POST, PATCH, DELETE | `withAuth` | Prisma profile service | OK | Section CRUD. |
| `/api/profile/connected-accounts` | GET, POST, DELETE | `withAuth` | Prisma/integration service | Risk | Token storage and OAuth state handling should be reviewed. |
| `/api/profile/education` | GET, POST, PATCH, DELETE | `withAuth` | Prisma profile service | OK | Section CRUD. |
| `/api/profile/experience` | GET, POST, PATCH, DELETE | `withAuth` | Prisma profile service | OK | Section CRUD. |
| `/api/profile/privacy` | GET, PATCH | `withAuth` | Prisma profile service | OK | Privacy settings. |
| `/api/profile/projects` | GET, POST, PATCH, DELETE | `withAuth` | Prisma profile service | OK | Section CRUD. |
| `/api/profile/skills` | GET, POST, PUT, DELETE | `withAuth` | Prisma profile service | OK | Section CRUD. |
| `/api/profile/ai-insights` | GET | `withAuth` | Prisma/profile service | Risk | AI insight freshness and cost controls need review. |
| `/api/v1/candidates/profile` | GET, PATCH | `withAuth` | Prisma `Candidate` | OK | v1 candidate profile endpoint. |

## Resume

| Endpoint | Methods | Auth | Data Source | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `/api/resume` | GET, POST, DELETE | InsForge session + Prisma | `ResumeVersion` | Risk | Uses Prisma and parser service, but file URL generation/upload persistence is inconsistent. |
| `/api/resume/upload` | POST | InsForge direct | `resume_versions` | Broken | Live `resume_versions` table was not found. |
| `/api/resume/analyze` | POST | InsForge direct | `resume_versions`, `resume_suggestions` | Broken | Referenced tables were not found live. |
| `/api/resume/[id]` | GET, PATCH, DELETE | InsForge direct | `resume_versions` | Broken | Live `resume_versions` table was not found. |
| `/api/resume/[id]/suggestions` | POST | InsForge direct | `resume_versions`, `resume_suggestions` | Broken | Referenced tables were not found live. |
| `/api/v1/resumes` | GET | `withAuth` | Prisma `ResumeVersion` | OK | Lists authenticated user's resumes. |
| `/api/v1/resumes/upload` | POST | `withAuth` | Prisma + local public upload | Risk | Writes files to `public/uploads/resumes`; move to InsForge storage. |
| `/api/v1/resumes/analyze` | POST | `withAuth` | Prisma | Risk | Depends on parsed resume content quality. |
| `/api/v1/resumes/score/[jobId]` | GET | `withAuth` | InsForge `resumes` | Broken | Live `resumes` table was not found. |

## Jobs and Recommendations

| Endpoint | Methods | Auth | Data Source | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `/api/jobs/search` | GET | `withAuth` | Prisma jobs/recommendations | OK | Authenticated job search. |
| `/api/jobs/recommendations` | GET, POST | `withAuth` | Prisma recommendations/cache | Risk | Redis/queue behavior should be tested without local Redis. |
| `/api/jobs/apply` | POST | `withAuth` | Prisma applications | OK | Candidate applies to a job. |
| `/api/jobs/save` | POST, DELETE | `withAuth` | Prisma saved jobs | OK | Save/unsave job. |
| `/api/jobs/saved` | GET | `withAuth` | Prisma saved jobs | OK | Saved jobs list. |
| `/api/jobs/alerts` | GET, POST | `withAuth` | Prisma job alerts | OK | Candidate alert preferences. |
| `/api/jobs/behavior-events` | POST | `withAuth` | Prisma behavior events | OK | Recommendation telemetry. |
| `/api/v1/jobs` | GET | Public | InsForge `jobs` | Broken | Live lower-case `jobs` table was not confirmed; Prisma has quoted `Job`. |
| `/api/v1/jobs/search` | GET | Public | InsForge `jobs` | Broken | Same table mismatch risk as `/api/v1/jobs`. |
| `/api/v1/jobs/listings` | GET | Public | `job_listings`, `job_ats_scores` | OK | Live tables exist; public data endpoint. |
| `/api/v1/jobs/listings/[id]` | GET | Public | `job_listings`, `job_ats_scores` | OK | Live tables exist. |
| `/api/v1/jobs/ats-score` | GET, POST | InsForge/session manual | `job_listings`, `job_ats_scores`, Prisma resumes | Risk | Works with live tables but depends on canonical resume data and manual auth flow. |
| `/api/v1/jobs/ats-score/[id]` | GET | Manual/session | `job_ats_scores` | OK | Live table exists. |
| `/api/v1/jobs/apply` | POST | `withAuth` | InsForge `resumes` plus app data | Broken | References live-absent `resumes`. |
| `/api/recruiter/recommended-candidates` | GET | `withAuth` | Prisma recommendations/candidates | Risk | Recruiter authorization must be validated. |

## Applications

| Endpoint | Methods | Auth | Data Source | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `/api/v1/applications` | GET, POST | `withAuth` | Prisma applications | OK | Application list/create. |
| `/api/v1/applications/[id]` | GET, PATCH | `withAuth` | Prisma applications | OK | Detail/update. |
| `/api/v1/applications/[id]/notes` | POST | `withAuth` | Prisma notes | OK | Add note. |
| `/api/v1/applications/[id]/withdraw` | POST | `withAuth` | Prisma applications | OK | Withdraw application. |
| `/api/v1/applications/analytics` | GET | `withAuth` | Prisma analytics | OK | Candidate analytics. |
| `/api/v1/applications/reminders` | GET | `withAuth` | Prisma reminders | OK | Smart reminders. |
| `/api/v1/applications/recruiter-activity` | POST | `withAuth` | Prisma activity/telemetry | Risk | Lint flags unused authenticated request variable. |

## Skill Gap and Career

| Endpoint | Methods | Auth | Data Source | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `/api/v1/skills/gap-analysis` | GET, POST | Manual/session | `skill_gaps`, `job_listings`, Prisma resume | Risk | Live tables exist, but route is large and does many jobs at once. |
| `/api/v1/skills/resources` | POST | `withAuth` | AI/resource service | Risk | Needs rate limiting and output validation review. |
| `/api/v1/career/path` | POST | `withAuth` | `parsed_resumes` | Broken | Live `parsed_resumes` table was not found. |
| `/api/roadmap` | GET, POST | Route-specific | Prisma roadmap | Risk | Auth behavior should be confirmed in tests. |
| `/api/roadmap/milestones/[id]` | PATCH, DELETE | Route-specific | Prisma roadmap | Risk | Auth/ownership checks should be tested. |
| `/api/roadmap/skills/[id]` | PATCH, DELETE | Route-specific | Prisma roadmap | Risk | Auth/ownership checks should be tested. |

## Interviews

| Endpoint | Methods | Auth | Data Source | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `/api/interviews` | GET, POST | InsForge auth | `interview_sessions` | OK | Live table exists. |
| `/api/interviews/[id]` | GET, PATCH | InsForge auth | `interview_sessions`, `interview_messages` | OK | Ownership filtering should be verified. |
| `/api/interviews/[id]/message` | POST | InsForge auth | `interview_sessions`, `interview_messages`, AI | Risk | Completion and async analysis are not durable. |
| `/api/interviews/[id]/end` | POST | InsForge auth | `interview_sessions`, feedback generator | Risk | Feedback generation is fire-and-forget. |
| `/api/interviews/[id]/feedback` | GET | InsForge auth | `interview_sessions`, `interview_feedback` | OK | Returns generating status when feedback absent. |

## Integrations

| Endpoint | Methods | Auth | Data Source | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `/api/integrations/oauth-url` | GET | `withAuth` | Integration config | Risk | Validate provider allowlist, redirect URI, and state. |
| `/api/integrations/callback/[provider]` | GET | OAuth callback | Integration service | Risk | Confirm CSRF/state validation and token encryption. |
| `/api/integrations/disconnect` | DELETE | `withAuth` | Integration service | OK | Disconnect provider. |

## Response Shape Issues

Observed response styles include:

- Raw JSON resource responses.
- `{ success, data }`.
- `{ data }`.
- `{ error }`.
- Custom adapter-friendly shapes in frontend hooks/stores.

Recommendation: create one API envelope for new routes and keep adapters only at legacy boundaries.

