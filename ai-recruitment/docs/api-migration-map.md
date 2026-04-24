# SmartHire API Migration Map

Complete mapping of **Original Routes** → **SmartHire v1 Routes** with data shape changes.

## Environment Setup

Create `.env.local` with:

```env
NEXT_PUBLIC_INSFORGE_BASE_URL=https://2674danq.ap-southeast.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=<from get-anon-key MCP>
```

Get the anon key via InsForge MCP: `mcp insforge get-anon-key`

## Route Mapping Table

| Page | Component | Old Route | New v1 Route | Method | Data Shape Changes |
|------|-----------|-----------|--------------|--------|--------------------|
| Login | LoginForm | POST /api/auth (action: sign-in) | POST /api/v1/auth/signin | POST | Map `email`+`password` → same; session established via InsForge |
| Register | RegisterForm | POST /api/auth (action: sign-up) | POST /api/v1/auth/signup | POST | Same inputs; creates `candidates` row; response adds `candidateId` |
| Profile | ProfilePage | GET /api/profile | GET /api/v1/candidates/profile | GET | `profiles` → `candidates`; field mapping: name, headline, location, phone, etc. |
| Profile | ProfileForm | PATCH /api/profile | PATCH /api/v1/candidates/profile | PATCH | Schema: name→name, headline→headline, preferredRoles→preferred_roles, etc. |
| Profile | ResumeVersions | GET /api/resume | GET /api/v1/resumes | GET | `resume_versions` → `resumes`; ats_score from ats_scores; suggestions from resume_improvements |
| Profile | NewVersion | POST /api/resume | (upload file) POST /api/v1/resumes/upload | POST | No JSON create; use file upload instead |
| Resume | ResumePage | GET /api/resume | GET /api/v1/resumes | GET | Same as above |
| Resume | ResumeAnalyze | POST /api/resume/analyze | POST /api/v1/resumes/upload | POST | Upload file → returns parsed_resumes + ats_scores + resume_improvements |
| Resume | ATSScore | GET /api/resume (per version) | GET /api/v1/resumes/score/[jobId] | GET | Job-specific scoring; base score from latest upload |
| Roadmap | RoadmapPage | GET /api/roadmap | POST /api/v1/career/path | POST | `career_milestones` → `career_paths.stages`; requires target_role |
| Roadmap | AddMilestone | POST /api/roadmap | POST /api/v1/career/path | POST | v1 generates stages; no manual add — use target_role |
| Roadmap | ToggleMilestone | PATCH /api/roadmap/milestones/[id] | (stages are read-only) | — | v1 stages from AI; no PATCH — show as informational |
| Skills | SkillGap | (none) | POST /api/v1/skills/gap-analysis | POST | NEW — returns missing_skills, strong_skills, readiness_score |
| Jobs | JobsPage | (mock data) | GET /api/v1/jobs | GET | NEW — real jobs from `jobs` table |
| Jobs | JobSearch | (none) | GET /api/v1/jobs/search | GET | Params: role, location, skills, experience, page, limit |
| Jobs | ApplyButton | (none) | POST /api/v1/jobs/apply | POST | Body: job_id, cover_note (optional) |
| Interviews | InterviewPage | GET /api/interviews | GET /api/interviews | GET | Lists `interview_sessions` for the authenticated user |
| Interviews | StartSession | POST /api/interviews | POST /api/interviews | POST | Creates an `interview_sessions` row; body: role, interviewType, difficulty, durationMinutes |
| Interviews | InterviewRoom | GET /api/interviews/[id] | GET /api/interviews/[id] | GET | Returns session + full message transcript |
| Interviews | SendMessage | POST /api/interviews/[id]/message | POST /api/interviews/[id]/message | POST | Persists candidate turn, returns next AI question + progress |
| Interviews | EndSession | POST /api/interviews/[id]/end | POST /api/interviews/[id]/end | POST | Marks session completed and enqueues feedback generation |
| Interviews | FeedbackPage | GET /api/interviews/[id]/feedback | GET /api/interviews/[id]/feedback | GET | Returns generated `interview_feedback` report or `status: "generating"` |

## New v1 Routes Added

- `POST /api/v1/auth/signin` — Sign in (email/password), establishes InsForge session
- `GET /api/v1/resumes` — List resumes for authenticated candidate
- `GET /api/interviews` — List mock interview sessions for the authenticated user
- `POST /api/interviews` — Create a new mock interview session (AI Mock Interview Room)
- `GET /api/interviews/[id]` — Load a session with its full transcript
- `POST /api/interviews/[id]/message` — Send a candidate turn and receive the next AI question
- `POST /api/interviews/[id]/end` — End a session and enqueue feedback generation
- `GET /api/interviews/[id]/feedback` — Fetch the generated feedback report

## Data Adapter Mappings

### Candidate (profiles → candidates)
- `id` → `id`
- `name` → `name`
- `email` → `email`
- `image` → `avatar_url`
- `headline` → `headline`
- `phone` → `phone`
- `location` → `location` or `city`+`state`
- `school`, `graduationYear`, `linkedInUrl`, `githubUrl`, `websiteUrl` — not in candidates; use placeholders or extend v1
- `reputationScore` → `reputation_score`
- `technicalScore`, `softScore` — compute from profile_complete or defaults

### Resume (resume_versions → resumes)
- `id` → resume `id`
- `title` → `file_name`
- `atsScore` → from ats_scores.overall_score
- `suggestions` → from resume_improvements (type, section, suggested_text, explanation)

### Career Path (career_milestones → career_paths.stages)
- Milestone `title` → stage `title`
- `description` → `key_milestones`.join or stage title
- `completed` → not in v1 (stages are informational)
- `targetDate` → `timeline_months` (convert)

### AI Mock Interview Room (`interview_sessions` / `interview_messages` / `interview_feedback`)
- Session fields:
  - `role`, `interview_type`, `difficulty`, `status`, `duration_minutes`
  - `started_at`, `ended_at`, `overall_score`, `created_at`
- Messages: `role: "interviewer" | "candidate"`, `content`, `question_number`, `created_at`
- Feedback: `overall_score`, `technical_score`, `communication_score`, `depth_score`,
  `strengths[]`, `improvements[]`, `recommended_resources[]`, `summary`
- Powered by `anthropic/claude-sonnet-4.5` via the InsForge AI gateway.
  See `docs/sql/20260424_ai_mock_interview_room.sql` for the schema.
