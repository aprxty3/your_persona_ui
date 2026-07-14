# Your Persona's — Front-End

Main web interface for **Your Persona's** (AI-Powered Psychological Assessment). Built with Next.js 14+ App Router, TypeScript, and Tailwind CSS.

## Overview

A casual web-based psychological assessment platform — personality quiz (MBTI-style + GRIT) with essay analysis via Gemini API. Designed to be eye-catching for Gen Z/Gen Alpha (target 30% share rate), mobile-first, dual-locale (EN + ID).

Two main areas:
- **Public** `app/(public)` — Landing, onboarding, assessment flow, result page, auth
- **Member Dashboard** `app/(member)` — Quota, test history, GRIT trend, settings

## Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 14+ (App Router, `output: 'standalone'`) |
| Language | TypeScript (strict) |
| Client State | Zustand (+ `persist` → localStorage) |
| Server State | TanStack Query |
| Styling/Animation | Tailwind CSS + Framer Motion |
| Form/Validation | React Hook Form + Zod |
| i18n | next-intl (EN default + ID) |
| OG Image | `@vercel/og` (route handler, 9:16) |
| Anti-bot | `@marsidev/react-turnstile` |
| Chart | Recharts |
| Analytics | PostHog |

## Project Structure

```
your_persona_ui/
├── app/
│   ├── (public)/               # landing, /assessment, /results/[id], /auth/*
│   ├── (member)/dashboard/     # protected area
│   ├── api/og/                 # OG image 9:16
│   ├── robots.ts / sitemap.ts
│   ├── layout.tsx / page.tsx
│   └── middleware.ts           # route protection + locale negotiation
├── core/
│   ├── domain/                 # Zod schemas + TS types (mirror BE DTOs)
│   ├── infrastructure/         # apiClient (envelope, 401-refresh, Idempotency-Key)
│   └── application/            # hooks: useSubmitAssessment, useAuth, usePdfStatus, etc.
├── components/
│   ├── ui/                     # dumb: Button, Input, Card
│   └── features/               # smart: AssessmentForm, MascotDisplay, WellbeingNotice
├── public/
│   ├── mascots/                # 32 SVG assets — {MBTI}_{style}.svg
│   └── llms.txt
├── i18n/                       # next-intl dictionaries (en.json, id.json)
└── next.config.mjs
```

## Architecture

Clean Architecture — components NEVER `fetch` directly. Flow: component → hooks (`core/application`) → apiClient (`core/infrastructure`). Zod schemas in `core/domain` serve dual purpose: form validation AND API response parsing.

## Commands

```bash
pnpm install          # install dependencies
pnpm dev              # development server
pnpm build            # production build
pnpm lint             # linting
pnpm test             # run tests
```

```bash
docker build -f Dockerfile .     # standalone image, target <150MB
```

## Deployment

- `output: 'standalone'` — Docker image < 150MB
- NGINX reverse proxy in front of the Next.js container
- Co-located with controller-api + Postgres + Redis (Docker all-in-one, 4GB RAM VPS)
- Cloudflare CDN for static asset caching (mascots, JS bundles)

## Design System

Color palette (PRD Section 3b):
- **Primary** `#0E9AA8` (teal blue)
- **Secondary** `#14B8A6` (teal green)
- **Accent** `#9333EA` (bright purple — used sparingly: CTA/badge/highlight)
- **Background** dominant white, generous whitespace

Style: Naive Design/kidcore aesthetic, `rounded-2xl/3xl`, soft shadows, Framer Motion micro-animations.

## Related Repos

| Repo | Description |
|---|---|
| `controller-api` | Backend API (Go, PostgreSQL, Redis, Gemini API) |
| `psyche-assessment-docs` | PRD, ERD, MEMORY.md (local-only, not pushed to GitHub) |

## Documentation

- **`TECHNICAL_DOCUMENTATION.md`** — API contracts, token management, error mapping, implementation details (primary reference)
- **`AGENTS.md`** — Architecture & security rules for AI coding agents
- **`CHECKLIST.md`** — Work order M0–M6 (milestones)
- **`psyche-assessment-docs/PRD-psyche-assessment-mvp.md`** — Full product specification (sibling repo, local-only)