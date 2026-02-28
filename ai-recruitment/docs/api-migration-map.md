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
| Interviews | InterviewPage | GET /api/interviews | GET /api/v1/interviews/mock | GET | `mock_interview_sessions` → `mock_interviews` |
| Interviews | StartSession | POST /api/interviews | POST /api/v1/interviews/mock/start | POST | Creates mock_interviews row; returns session id |
| Interviews | InterviewChat | POST /api/interviews/[id]/messages | POST /api/v1/interviews/mock | POST | Body: messages, target_role, session_type, sessionId; streams response |

## New v1 Routes Added

- `POST /api/v1/auth/signin` — Sign in (email/password), establishes InsForge session
- `GET /api/v1/resumes` — List resumes for authenticated candidate
- `GET /api/v1/interviews/mock` — List mock interview sessions
- `POST /api/v1/interviews/mock/start` — Create new mock interview session

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

### Mock Interview
- `id` → `id`
- `title` → `target_role`
- `type` → `session_type`
- `status` → `status`
- `startedAt` → `started_at`
- `messages` → `messages` (array of {role, content})
