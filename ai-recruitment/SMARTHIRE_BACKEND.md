# SmartHire Backend — InsForge Integration

Backend built with **Next.js API Routes** and **InsForge BaaS** via MCP.

## InsForge MCP Setup

### Required .env.local

```env
NEXT_PUBLIC_INSFORGE_BASE_URL=https://2674danq.ap-southeast.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=<from get-anon-key MCP>
```

Obtain via InsForge MCP tools:
- `get-backend-metadata` — Auth, buckets, tables
- `get-anon-key` — Client anon token
- `download-template` (frame: nextjs) — Pre-filled .env

## Database Tables (InsForge PostgreSQL)

| Table | Purpose |
|-------|---------|
| `candidates` | User profiles (id = auth uid) |
| `jobs` | Job listings |
| `resumes` | Uploaded resumes |
| `parsed_resumes` | AI-parsed resume data |
| `ats_scores` | ATS scores (base + per-job) |
| `resume_improvements` | Improvement suggestions |
| `skills` | Master skills taxonomy |
| `skill_gaps` | Candidate skill gap analysis |
| `learning_paths` | Learning milestones |
| `career_paths` | Career stage roadmaps |
| `applications` | Job applications |
| `mock_interviews` | Mock interview sessions |
| `notifications` | In-app notifications |

## Storage Buckets

- `resumes` — Resume PDF/DOCX files
- `avatars` — Profile avatars
- `parsed-data` — Parsed resume cache (optional)

## API Routes (`/api/v1/`)

### Auth
- `POST /api/v1/auth/signup` — Sign up + create candidate

### Candidates
- `GET /api/v1/candidates/profile` — Get profile
- `PATCH /api/v1/candidates/profile` — Update profile

### Resumes
- `POST /api/v1/resumes/upload` — Upload + parse + score + suggest
- `GET /api/v1/resumes/score/[jobId]` — Job-specific ATS score

### Jobs
- `GET /api/v1/jobs` — List active jobs
- `GET /api/v1/jobs/search` — Search (role, location, skills, experience)
- `POST /api/v1/jobs/apply` — Apply to job

### Skills & Career
- `POST /api/v1/skills/gap-analysis` — Skill gap for target role
- `POST /api/v1/career/path` — Career roadmap for target role

### Interviews
- `POST /api/v1/interviews/mock` — Streaming mock interview (AI)

## Services

- `ExtractorService` — PDF/DOCX text extraction (pdf-parse, mammoth)
- `ParserService` — AI resume parsing (InsForge AI / gpt-4o-mini)
- `ScorerService` — ATS base + job-specific scoring
- `OptimizerService` — AI improvement suggestions

## Auth Flow

Uses existing InsForge Auth:
- Sign-in/Sign-up via `/api/auth` (Insforge auth route)
- `withAuth` middleware validates JWT from cookies
- `candidateId` = `auth.uid()` (candidates.id)
