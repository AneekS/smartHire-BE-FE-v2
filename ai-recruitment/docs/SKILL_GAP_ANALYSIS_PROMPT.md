# Cursor Pro Prompt: Skill Gap Analysis (Personalized, Full-Resume)

Use this prompt in Cursor when fixing or extending the Skill Gap Analysis feature so it stays **accurate**, **personalized**, and based on the **entire parsed resume**.

---

## The Problem (reminder)

The Skill Gap Analysis must NOT be generic. It must:
1. Read the candidate's **full parsed resume** (same data as Resume Optimizer: Prisma `ResumeVersion.parsedContent`).
2. Use **all sections**: skills, experience, education, projects, summary.
3. Produce **personalized** results: skillsYouHave = every skill from the resume; criticalGaps = what’s missing for the target role; **varied** demand scores (not all 75%).
4. Show **all** skills in the UI (no “17” in the header and only 1 chip).

---

## Step 0 — Read these files first

```bash
src/app/api/v1/skills/gap-analysis/route.ts   # API: Prisma resume + OpenAI
src/store/useSkillGapStore.ts                 # mapLegacyResponseToGapAnalysis, analyzeFromResume / analyzeTargetRole
src/components/skills/tab1-resume/            # SkillsYouHaveGrid, CriticalGapsList, ResumeSkillAnalysis
prisma/schema.prisma                          # ResumeVersion.parsedContent
```

---

## Root cause checklist

- **Resume source:** Gap analysis must use **Prisma** `ResumeVersion.parsedContent` (full JSON with skills, experience, education, projects, summary). Do not rely only on InsForge `parsed_resumes` unless that table is the single source of truth for your app.
- **Context sent to OpenAI:** Build a **rich text block** from parsed content: all skill names, experience (title, company, bullets), projects (name, techStack, bullets), education, summary. Send that entire block in the user message.
- **Prompt rules:** Tell the model to (1) list **every** skill from the resume in `strong_skills`, (2) use **varied** `demand_score` / `demandScore` per gap (e.g. 88, 72, 65), (3) base gaps only on what’s actually missing for the target role.
- **Post-processing:** If all `missing_skills` have the same `demand_score`, apply variance (e.g. by index + small random) and re-sort by score.
- **Store mapper:** Map `strong_skills` to `skillsYouHave` (support both string[] and object[] with `name`). Map `missing_skills` to `criticalGaps` and pass through `demand_score` as `demandScore`.
- **UI:** Normalize `skillsYouHave` so each item has `name` and `proficiency`; render **all** skills (e.g. “Show all” beyond 12). Use a stable key (e.g. `name` + index) to avoid React key issues.

---

## API contract (current)

- **POST /api/v1/skills/gap-analysis**
  - Body: `{ source: "resume" | "manual", targetRole?: string, experienceLevel?: "entry"|"mid"|"senior"|"staff" }`
  - For `source: "resume"`: require a resume in Prisma; infer target role from first job if `targetRole` not provided.
  - Response: `{ readiness_score, strong_skills: string[], missing_skills: [{ skill, priority, reason, estimated_hours, demand_score }], summary?, lastAnalyzedAt? }`
  - `demand_score` must be **varied** per gap (enforced in prompt + post-process).

---

## Non-negotiable rules

1. Log skills count, experience count, and project count **before** the OpenAI call.
2. If `source === "resume"` and no parsed resume in Prisma → return 400 `NO_RESUME`.
3. `demand_score` / `demandScore` must **vary** across gaps; add post-processing if the model returns identical values.
4. `strong_skills` / `skillsYouHave` must only include skills **from the resume**; do not invent skills.
5. `criticalGaps` must be specific to the **target role** and candidate background.
6. UI must handle both string[] and object[] for skills and show all items (with “Show all” if needed).
7. Cache/key must include both `targetRole` and `experienceLevel` if you add caching.
8. `personalizedInsights` or `summary` should reference something **specific** from the resume when present.

---

## Verify end-to-end

1. Upload a resume with multiple skills and a Projects section (Resume Optimizer flow).
2. Open Skill Gap Analysis → Resume-Based Analysis (or Target Role Explorer with a role).
3. Run analysis; check server logs for “Candidate context: { skillsCount, experienceCount, projectCount }”.
4. UI: “Skills You Have” count must match the number of chips (or “Show all” reveals all).
5. Critical Gaps: demand badges/percentages must **differ** (e.g. 85%, 72%, 58%), not all the same.
