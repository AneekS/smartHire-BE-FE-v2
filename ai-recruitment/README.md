# SmartHire AI - AI Recruitment Platform

A multi-page AI recruitment website built with Next.js 14+, featuring resume optimization, job matching, mock interviews, and career roadmap tools for Indian engineering freshers.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod
- **State**: Zustand
- **Database**: Prisma + PostgreSQL
- **Auth**: NextAuth.js
- **AI**: OpenAI / Vercel AI SDK
- **Email**: Resend
- **File Upload**: UploadThing

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy the example env file and configure:

```bash
cp .env.example .env.local
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Auth secret
- `NEXTAUTH_URL` - App URL (e.g., http://localhost:3000)
- `OPENAI_API_KEY` - For AI features

### 3. Database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, Register
│   ├── (dashboard)/     # Dashboard, Jobs, Resume, Interviews, Profile, Roadmap
│   ├── (public)/        # Landing page
│   └── api/             # API routes
├── components/
│   ├── layout/          # Navbar, Footer, Sidebar, DashboardLayout
│   ├── sections/        # Hero, HowItWorks, KPI, Features, Pricing
│   └── ui/              # shadcn components
├── lib/
├── hooks/
├── store/
└── types/
```

## Design Source

All designs were extracted from Stitch platform exports. See `DESIGN_EXTRACTION.md` in the parent directory for the full design extraction checklist.

## Implemented Pages

- ✅ Landing Page (Hero, How It Works, KPIs, Features, Pricing)
- ✅ Job Search & Smart Matches
- ✅ Intelligence Hub Dashboard
- ✅ Login / Register
- 🔲 AI Resume Optimizer (full workspace - in progress)
- 🔲 Candidate Profile & Settings
- 🔲 Career Roadmap & Skill Lab
- 🔲 AI Mock Interview Room

## Deployment

Optimized for Vercel. Set environment variables in the Vercel dashboard and deploy.
