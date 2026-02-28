# InsForge Backend Setup

This project uses **InsForge** for authentication, cloud storage, database, and AI functions.

## Required: Get Connection Credentials

Use the **InsForge MCP** tool to populate your `.env.local`:

1. **get-backend-metadata** – Returns auth config, database metadata, storage buckets
2. **get-anon-key** – Returns `NEXT_PUBLIC_INSFORGE_ANON_KEY` for client SDK
3. Base URL is in **fetch-docs** with `docType: "instructions"` or from your InsForge project's Connect tab

Or run **download-template** (frame: nextjs) – the generated `.env` includes your project’s base URL and anon key.

## .env.local Variables

```env
NEXT_PUBLIC_INSFORGE_BASE_URL=https://your-app.region.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=<from get-anon-key>
```

## Email verification (local development)

If you see **"Email verification required"** when logging in, your InsForge project has **Require email verification** enabled. To log in without verifying:

1. Open your **InsForge project dashboard** (from [InsForge](https://insforge.app) or your project URL).
2. Go to **Auth** or **Settings** → **Authentication**.
3. Turn off **Require email verification** (or set **Verify email method** to optional).
4. Try logging in again.

Alternatively, use the verification link sent to your email when you signed up.

## MCP Tools Used

| Tool | Purpose |
|------|---------|
| `get-backend-metadata` | Auth config, buckets, functions, AI models |
| `get-anon-key` | Client anon token |
| `create-bucket` | Created `resumes` bucket |
| `run-raw-sql` | Created tables: profiles, resume_versions, resume_suggestions, mock_interview_sessions, mock_interview_messages, career_milestones, skill_goals |
| `create-function` | Deploy edge functions for AI resume analysis and mock interview |

## Database Tables (InsForge PostgreSQL)

- `profiles` – User profile (headline, scores, preferences)
- `resume_versions` – Resume versions with ATS scores
- `resume_suggestions` – AI suggestions per version
- `mock_interview_sessions` – Interview sessions
- `mock_interview_messages` – Chat messages
- `career_milestones` – Roadmap milestones
- `skill_goals` – Skill Lab goals
