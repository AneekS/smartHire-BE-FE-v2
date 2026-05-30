# ATS Engine — prompt / requirement checklist

This maps the scoring-engine fix prompts (Batches 1–4) to code and how to verify them in Job ATS.

## Architecture (target state)

| Path | Engine | Persist |
|------|--------|---------|
| Job ATS (`POST /api/v1/jobs/ats-score`) | `ATSEngine.compute` | `application_ats_scores`, `ats_skill_gaps`, `career_readiness` + UI cache `job_ats_scores` |
| Recruiter / `POST /api/v1/ats/generate` | `ATSEngine.compute` | Same |
| Fallback (bridge/job missing) | `scoreEphemeralForListing` | `job_ats_scores` only |

## Batch 1 — Dealbreakers & experience

| Requirement | Implementation | Verify |
|-------------|----------------|--------|
| Missing must-have skills trigger dealbreaker cap | `DealBreakerDetector` + `computeFinalScore({ applyDealbreakerCap })` | Score with resume missing required JD skills → `dealbreakers[]`, cap flag |
| Single penalty (not compliance 35 + overall 30) | `ComplianceChecker` no floor; cap only in `FinalScoreComputer` | UI: compliance can be &lt; 30; overall capped once |
| Experience years from date ranges when field missing | `experience-years.ts` / `ExperienceScorer` | Resume without `yearsOfExperience` but with jobs → non-zero experience score |

## Batch 2 — Job schema from DB

| Requirement | Implementation | Verify |
|-------------|----------------|--------|
| Prisma `Job` fields override JD text heuristics | `jobSchemaFromPrismaJob` | Job with `experienceMin` in DB beats text-only parse |
| `JobSkill` rows merged into required skills | `buildDbRequiredSkills` | Skills only in `job_skills` table still match |

## Batch 3 — API / UI fields

| Requirement | Implementation | Verify |
|-------------|----------------|--------|
| `percentileRank` when ≥10 tenant scores | `ATSEngine` + `ScoreNormalizer.percentileFromHistory` | After 10+ scores same industry in tenant |
| `dealbreakers`, `dealbreakerCapApplied` in API | `AtsComputeResult` + job listing mapper | Network tab on score POST |
| `skillScoreReliable` | `SemanticScorer` / skill matcher | Low-skill JD → flag `SKILL_MATCH_UNRELIABLE` |
| Industry-aligned percentile cohort | Same-tenant `application_ats_scores` history | Compare percentile with/without cohort |

## Batch 4 — Route consistency

| Requirement | Implementation | Verify |
|-------------|----------------|--------|
| v3 facade uses `ATSEngine.compute` for DB jobs | `AtsEngineV3.scoreForJob` | `pipeline: ats-v3-persisted` in response |
| Listing ephemeral when no Job | `scoreForJobListing` (fallback only) | `pipeline: ats-v3-ephemeral` |
| No cross-tenant job fallback | `resolveJobForScoring` tenant filter | Wrong tenant → 404 / not found |

## Job ATS full engine (this change)

| Step | What |
|------|------|
| Upload / parse | `ParseStage` calls `ensureResumeV2Bridge` |
| Embed | `EmbedStage` ensures v2 before indexing |
| Score listing | `ensureJobFromListing` + `ATSEngine.compute` |
| Backfill | `npm run db:bridge-resume-v2` |
| Sync catalog jobs | `npm run db:sync-listing-jobs` |

## Manual test plan

1. `npm run db:bridge-resume-v2` (once on Azure DB).
2. `npm run db:sync-listing-jobs` (optional, or happens on first score).
3. Upload resume → wait for parse complete.
4. Job ATS → score a listing → response `pipeline` should be **`ats-v3-persisted`**, with `percentileRank` when enough history.
5. Re-open same listing → cached `job_ats_scores` if same resume id.
6. `npx vitest run src/scoring` — unit tests for engine.

## Not in scope (by design)

- Rescaling all component scores when dealbreaker cap applies (cap is on overall only).
- New Prisma column for `percentileRank` on legacy `job_ats_scores` (stored in JSON `details` + `application_ats_scores`).
