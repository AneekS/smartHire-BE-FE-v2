# SmartHire AI - Design Extraction Summary

This document captures all design details extracted from the Stitch HTML/CSS files and screenshots for the AI Mock Interview Suite project.

## Design Files Inventory

| Page | Source | Has HTML | Has Screenshot |
|------|--------|----------|----------------|
| Job Search & Smart Matches | job_search_smart_matches/ | ✓ | ✓ |
| SmartHire Landing 1 | smarthire_ai_landing_page_1/ | ✓ | ✓ |
| SmartHire Landing 2 | smarthire_ai_landing_page_2/ | ✓ | ✓ |
| SmartHire Landing 3 | smarthire_ai_landing_page_3/ | ✓ | ✓ |
| SmartHire Landing 4 | smarthire_ai_landing_page_4/ | - | ✓ |
| Intelligence Hub Dashboard | intelligence_hub_dashboard/ | ✓ | ✓ |
| AI Resume Optimizer 1 | ai_resume_optimizer_workspace_1/ | - | ✓ |
| AI Resume Optimizer 2 | ai_resume_optimizer_workspace_2/ | ✓ | ✓ |
| Candidate Profile 1 | candidate_profile_settings_1/ | ✓ | ✓ |
| Candidate Profile 2 | candidate_profile_settings_2/ | ✓ | ✓ |
| Career Roadmap & Skill Lab | career_roadmap_skill_lab/ | - | ✓ |
| AI Mock Interview Room | ai_mock_interview_room/ | - | ✓ |

## Color Palette (Extracted from HTML/CSS)

| Token | Hex | Usage |
|-------|-----|-------|
| primary | #6366f1 | Indigo - main brand, buttons |
| cta-blue | #3B82F6 | CTA buttons, links |
| secondary | #06b6d4 | Cyan - highlights, badges |
| accent | #8B5CF6 | Purple - sidebar, gradients |
| heading | #1F2937 | Charcoal - headings |
| body | #6B7280 | Grey - body text |
| surface | #FFFFFF | Cards, modals |
| bg | #F8F9FD | Page background |
| border | rgba(148,163,184,0.15) | Subtle borders |

## Typography

- **Font Family**: Plus Jakarta Sans (primary), Bricolage Grotesque (display/headings in some pages)
- **Weights**: 300, 400, 500, 600, 700, 800
- **Icons**: Material Icons Round / Material Symbols Outlined → Lucide React

## Spacing & Radius

- **Border Radius**: 12px default, 16px xl, 24px 2xl, 100px pill
- **Card Radius**: 24px (rounded-2xl)
- **Shadow**: `0 10px 15px -3px rgba(148, 163, 184, 0.12)`

## Gradients (from designs)

- **Blue Glow**: `linear-gradient(105deg, #4F46E5 0%, #3B82F6 100%)`
- **Sunset**: `linear-gradient(105deg, #F97316 0%, #FB923C 100%)`
- **Emerald**: `linear-gradient(105deg, #10B981 0%, #34D399 100%)`
- **Violet**: `linear-gradient(105deg, #8B5CF6 0%, #A78BFA 100%)`
- **Mesh Hero**: radial gradients (E0C3FC, FBC2EB, FFECD2)

## Component Patterns

- **Glass Nav**: `bg-white/70 backdrop-blur-xl`
- **Card**: white bg, subtle border, 24px radius, soft shadow
- **Badge**: pill-shaped, primary/10 bg for active, slate for inactive
- **Button Primary**: solid primary/cta-blue, rounded-full (100px)

## Implemented Pages

1. ✅ Landing Page (Hero, How It Works, KPIs, Features, Pricing)
2. ✅ Job Search & Smart Matches
3. ✅ Intelligence Hub Dashboard
4. ✅ Login / Register (basic)
5. ✅ Dashboard Layout with Sidebar
6. 🔲 AI Resume Optimizer (full workspace)
7. 🔲 Candidate Profile & Settings
8. 🔲 Career Roadmap & Skill Lab
9. 🔲 AI Mock Interview Room
