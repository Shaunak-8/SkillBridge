# SkillBridge

Skills-first project matching for local businesses and students, with Neon Auth and server-side role protection. Built for Problem Statement 24.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Validation commands:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Architecture

- `src/app`: Next.js App Router routes grouped into public, auth, student, business, and admin experiences.
- `src/components`: reusable UI primitives, public navigation, dashboard shell, cards, badges, and role pages.
- `src/data/mock-data.ts`: clearly isolated demo data and replaceable service boundary.
- `src/types`: shared domain contracts for users, skills, projects, teams, applications, assessments, submissions, feedback, and screening.
- `src/lib/auth`: Neon Auth clients, session checks, profile creation, validation, CSRF checks, and shared rate limiting.
- `src/lib/db.ts`: server-only Neon Postgres access.
- `migrations`: additive application migrations. Neon Auth-managed tables are never modified.

Server Components are used by default. Authentication and profiles use live Neon services; project matching, AI workflows, and payments still use demo content or placeholders. See [authentication setup and test results](AUTHENTICATION.md) for configuration, Google OAuth, database details, and the complete file inventory. Set the environment values before running the migration. If `.env.local` already exists, keep it instead of copying the example over it.

## Implemented

- Neon email/password and Google authentication, verification codes, password recovery/reset, account linking, persistent sessions, and logout.
- Transactional, idempotent profiles, unique case-insensitive usernames, and one-time Student/Business onboarding.
- Server-side Student, Business, and Admin page/API authorization; Admin is never self-selectable.
- Responsive landing, about, auth, project board, and project detail pages.
- Six diverse student profiles, four local businesses, eight projects, applications, milestones, and assessment demo data.
- Student, business, and admin dashboards with shared sidebar/navigation.
- Student profile, projects, applications, assessments, and active project views.
- Business profile, projects, post-problem form, application/workspace routes, screening preview, and billing placeholder.
- Admin dashboard, users, and projects views.
- Skills-first matching language, technical and non-technical skill badges, empty/loading-ready visual patterns, form validation attributes, and `.env.example`.

## Next steps

1. Replace `src/data/mock-data.ts` with authorized server-side Neon Postgres queries.
2. Connect application uploads to a suitable storage service.
3. Add server actions for applications, project milestones, deliverables, and feedback.
4. Integrate AI screening and resume/portfolio analysis behind explicit business consent and billing.
5. Complete production OAuth/SMTP configuration and the remaining Google consent tests in the authentication guide.
