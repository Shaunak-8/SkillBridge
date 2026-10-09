# skillbridge

Skills-first project matching for local businesses and students. This repository is the initial frontend foundation for Problem Statement 24.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Validation commands:

```bash
npm run typecheck
npm run build
```

## Architecture

- `src/app`: Next.js App Router routes grouped into public, auth, student, business, and admin experiences.
- `src/components`: reusable UI primitives, public navigation, dashboard shell, cards, badges, and role pages.
- `src/data/mock-data.ts`: clearly isolated demo data and replaceable service boundary.
- `src/types`: shared domain contracts for users, skills, projects, teams, applications, assessments, submissions, feedback, and screening.
- `src/lib`: utilities and future Supabase integration boundary.

Server Components are used by default. The project board uses a Client Component only for search and category filtering. Authentication, AI workflows, payments, and production database operations are intentionally not implemented in this phase.

## Implemented

- Responsive landing, about, auth, project board, and project detail pages.
- Six diverse student profiles, four local businesses, eight projects, applications, milestones, and assessment demo data.
- Student, business, and admin dashboards with shared sidebar/navigation.
- Student profile, projects, applications, assessments, and active project views.
- Business profile, projects, post-problem form, application/workspace routes, screening preview, and billing placeholder.
- Admin dashboard, users, and projects views.
- Skills-first matching language, technical and non-technical skill badges, empty/loading-ready visual patterns, form validation attributes, and `.env.example`.

## Next steps

1. Connect Supabase Auth and RLS policies around the role boundaries.
2. Replace `src/data/mock-data.ts` with typed Supabase queries and storage uploads.
3. Add server actions for applications, project milestones, deliverables, and feedback.
4. Integrate AI screening and resume/portfolio analysis behind explicit business consent and billing.
5. Add production test coverage and error/loading route states.
