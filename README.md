# SkillProof

**AI-Powered Skill Verification & Career Platform for Bangladesh.**

[![Website](https://img.shields.io/badge/Website-skillproof.top-E31B23?style=flat-square&logo=google-chrome&logoColor=white)](https://skillproof.top)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![PHP](https://img.shields.io/badge/PHP-AI%20Gateway-777BB4?style=flat-square&logo=php&logoColor=white)](https://www.php.net)
[![License](https://img.shields.io/badge/License-Not%20Specified-lightgrey?style=flat-square)](#-license)

---

## 📌 Overview

**SkillProof** is a career platform built for **Bangladesh** that brings candidates, companies/recruiters, and platform administrators into one ecosystem for **skill verification, career development, and hiring**.

The platform is organized around three audiences, each with its own portal, workflow, and permissions:

| Audience | Portal | Purpose |
| --- | --- | --- |
| **Candidates** | `/dashboard/*` | Build a verified Skill Passport, follow career roadmaps, and apply for jobs. |
| **Companies / Recruiters** | `/company/*` | Post jobs, search candidates, manage applications, run interviews. |
| **Administrators** | `/admin/*` | Govern the platform: verify skills, review passports, manage users and companies, monitor analytics and audit logs. |

> **Production website:** [https://skillproof.top](https://skillproof.top)
> **Android APK:** [https://skillproof.top/SkillProof.apk?v=dev](https://skillproof.top/SkillProof.apk?v=dev)

---

## ✨ Key Highlights

- ✅ **Skill Verification workflow** — universal assessments, evidence upload, admin review, verified-skill issuance.
- ✅ **Skill Passport** — passport ID, QR code, public verification, share links.
- ✅ **Career Roadmap** — templated learning paths with module exams and completion review.
- ✅ **Career Intelligence** — deterministic ML scoring of employability, skill gaps, and career matches (powered by a PHP in-house engine).
- ✅ **AI-assisted explanations** — natural-language summaries generated via a configured AI provider (see `deploy/README.md` for details).
- ✅ **Job Portal** — browse, apply, manage applications for candidates; post, edit, shortlist for companies.
- ✅ **Messaging** — candidate ↔ company messaging.
- ✅ **Interview module** — interview sessions, AI-graded answers, downloadable reports.
- ✅ **Admin governance** — RBAC, audit logs, analytics, employer/company verification, taxonomy, governance settings.
- ✅ **Android APK** — direct APK download from the production site.
- ✅ **Public verification portal** — anyone can verify a passport or certificate by ID/QR at `/verify`.

---

## 👤 Candidate Portal

Candidate-facing pages live under `/dashboard/*` and require authentication plus an active subscription.

| Feature | URL | Description | Status |
| --- | --- | --- | --- |
| Overview Dashboard | [Open](https://skillproof.top/dashboard) | Central candidate dashboard | ✅ Available |
| SkillProof AI Career Profile | [Open](https://skillproof.top/dashboard/profile) | AI-assisted career profile builder | ✅ Available |
| Career Intelligence | [Open](https://skillproof.top/dashboard/skillproof-ml) | ML-driven employability, strengths, gaps, matches | ✅ Available |
| Career Roadmap | [Open](https://skillproof.top/dashboard/roadmap) | Templated learning paths & module exams | ✅ Available |
| Skill Verification | [Open](https://skillproof.top/dashboard/verify) | Universal skill assessment & evidence submission | ✅ Available |
| My Skill Passport | [Open](https://skillproof.top/dashboard/passport) | Passport, verified skills, QR, sharing | ✅ Available |
| SkillProof AI Interview | [Open](https://skillproof.top/dashboard/mentor) | AI Interview simulator UI | 🟡 Coming Soon |
| Job Portal | [Open](https://skillproof.top/dashboard/jobs) | Browse jobs, apply, view applications | ✅ Available |
| Interviews | [Open](https://skillproof.top/dashboard/interviews) | Scheduled interviews and history | ✅ Available |
| Messages | [Open](https://skillproof.top/dashboard/messages) | Candidate ↔ company messaging | ✅ Available |
| Settings | [Open](https://skillproof.top/dashboard/settings) | Account preferences, language, notifications | ✅ Available |
| Android APK | [Download](https://skillproof.top/SkillProof.apk?v=dev) | Mobile APK download | ✅ Available |

> The **AI Interview** route renders the interview UI shell but is currently labelled **Coming Soon** in the codebase (locked banner / premium room placeholder).

---

## 🏢 Company Portal

Company-facing pages live under `/company/*` and require company authentication, verification, and an active subscription.

| Feature | URL | Description | Status |
| --- | --- | --- | --- |
| Company Dashboard | [Open](https://skillproof.top/company/dashboard) | Hiring overview | ✅ Available |
| Company Profile | [Open](https://skillproof.top/company/profile) | Public company profile | ✅ Available |
| Job Posting / Job Management | [Open](https://skillproof.top/company/jobs) | Create / edit / list jobs | ✅ Available |
| Candidate Search | [Open](https://skillproof.top/company/candidates) | Search verified candidates | ✅ Available |
| Applications | [Open](https://skillproof.top/company/applications) | Incoming applications | ✅ Available |
| Shortlisted Candidates | [Open](https://skillproof.top/company/shortlisted) | Shortlist management | ✅ Available |
| Interviews | [Open](https://skillproof.top/company/interviews) | Schedule & manage interviews | ✅ Available |
| Messages | [Open](https://skillproof.top/company/messages) | Candidate ↔ company messaging | ✅ Available |
| Settings | [Open](https://skillproof.top/company/settings) | Company account settings | ✅ Available |
| Company Verification (OTP) | `/company/verify` | Phone/OTP verification step | ✅ Available |
| Company Pending | `/company/pending` | Shown until approved | ✅ Available |
| Company Subscription | `/company/subscription` | Subscription gate | ✅ Available |
| Android APK | [Download](https://skillproof.top/SkillProof.apk?v=dev) | Mobile APK download | ✅ Available |

---

## 🛡️ Admin Portal

Admin-facing pages live under `/admin/*` and require the platform `admin` / `super_admin` role.

| Feature | URL | Description | Status |
| --- | --- | --- | --- |
| Admin Dashboard | [Open](https://skillproof.top/admin) | Platform metrics, recent activity | ✅ Available |
| Roadmap Templates | [Open](https://skillproof.top/admin/roadmap-templates) | Manage career roadmap templates | ✅ Available |
| Skill Verification Manager | [Open](https://skillproof.top/admin/skill-verification) | Review universal skill submissions | ✅ Available |
| Assessment Review | [Open](https://skillproof.top/admin/assessment-review) | Review assessment submissions | ✅ Available |
| Passport Review | [Open](https://skillproof.top/admin/passport-review) | Approve / reject passport claims | ✅ Available |
| Passport Renewals | [Open](https://skillproof.top/admin/passport-renewals) | Handle passport renewal requests | ✅ Available |
| Roadmap Completion Review | [Open](https://skillproof.top/admin/roadmap-completion) | Review completed roadmaps | ✅ Available |
| Roadmap Module Exams | [Open](https://skillproof.top/admin/roadmap-module-exams) | Review module-level exam answers | ✅ Available |
| Course Certificates | [Open](https://skillproof.top/admin/course-certificates) | Manage course certificate records | ✅ Available |
| User Management | [Open](https://skillproof.top/admin/users) | List, search, edit user accounts | ✅ Available |
| Categories & Skills (Taxonomy) | [Open](https://skillproof.top/admin/taxonomy) | Manage skill categories & taxonomy | ✅ Available |
| Job Management | [Open](https://skillproof.top/admin/jobs) | Oversee all jobs across companies | ✅ Available |
| Audit Logs | [Open](https://skillproof.top/admin/audit-logs) | Platform-wide activity log | ✅ Available |
| Analytics | [Open](https://skillproof.top/admin/analytics) | Platform analytics dashboards | ✅ Available |
| Employer Verification | [Open](https://skillproof.top/admin/employer-verifications) | Verify employer accounts | ✅ Available |
| Company Management | [Open](https://skillproof.top/admin/companies) | Manage company accounts | ✅ Available |
| Governance & RBAC | [Open](https://skillproof.top/admin/governance) | Roles, permissions, governance | ✅ Available |
| Admin Settings | [Open](https://skillproof.top/admin/admin-settings) | Platform configuration | ✅ Available |

---

## 🧠 AI Capabilities

SkillProof blends deterministic ML scoring with optional AI-assisted natural-language explanations. The AI capabilities are split honestly between **available**, **partially available**, and **coming soon**.

### ✅ Available AI / ML Features

| Capability | What it does |
| --- | --- |
| **Career Intelligence (v2)** | Deterministic weighted-feature engine (`skillproof-career-intelligence-v2`) computes employability score, hiring readiness, top strengths, skill gaps, career matches, market readiness, and 30/60/90-day plan. Endpoint: `GET /api/ai-career-intelligence` |
| **AI Career Profile** | Generates and updates a candidate's AI career profile from profile + skills + experience data. Endpoint: `POST /api/profile-review` |
| **CV Parsing** | Uploads a CV/resume (DOCX/PDF), parses it server-side, and populates the career profile. Endpoint: `POST /api/parse-cv` |
| **AI Mentor (generation + grading)** | Generates interview questions, grades candidate answers, and produces a final session evaluation. Endpoints: `POST /api/mentor/*` and `POST /api/interview/grade-answer` |
| **Career Analysis** | AI-assisted natural-language career analysis. Endpoint: `POST /api/career-analysis` |
| **AI Center (latest + v2 predict)** | Dashboard card backed by `/api/ai-center/latest` and `/api/ai-center/v2/predict-v2`. Caches results by `profile_signature`. |
| **AI Course Suggestions** | Endpoint: `POST /api/ai-center/course-suggestions` |
| **Job Match** | Match-score computation for a candidate against a job. Endpoint: `POST /api/job-match/run` |
| **Public Employer Verification** | Anyone can verify a passport or certificate by ID/QR. Endpoint: `POST /api/employer/verify` |

> **AI provider:** SkillProof is configured to call an external AI provider (Groq `llama-3.3-70b-versatile`) for natural-language explanation generation. If the provider is unavailable, the deterministic engine still returns a response with `degraded: true`. API keys are **server-side only** and never exposed to the browser bundle.

### 🟡 Coming Soon / Planned AI Features

| Capability | Current state |
| --- | --- |
| **SkillProof AI Interview (full flow)** | The simulator UI and premium room component exist, but the candidate-facing route is currently labelled **Coming Soon** with a locked banner. |
| **AI Career Center (v1 dashboard)** | Legacy v1 endpoints exist (`/api/ai-center/latest`, `/api/ai-center/course-suggestions`); v2 supersedes them. Some cards are still placeholders. |
| **Career Simulation / What-If Analysis** | Service stubs exist; full user-facing functionality is still under development. |

> The codebase intentionally distinguishes between **server-side deterministic scoring** (always available) and **AI-generated prose** (best-effort, with fallback). Production deployments degrade gracefully when the AI provider is unreachable.

---

## 🛂 Skill Verification

SkillProof's verification flow is built around the universal-assessment system in `src/services/assessments.ts` and `src/services/skillVerification.ts`.

```
1. Candidate selects a skill from the taxonomy
   ↓
2. Universal assessment is generated (server-side, dynamic)
   ↓
3. Candidate submits answers + evidence (file uploads, signed URLs)
   ↓
4. Admin reviews submission (Assessment Review / Skill Verification Manager)
   ↓
5. Approve  → verified skill is added to the candidate's Skill Passport
   Reject   → feedback is shown to the candidate
```

**Evidence uploads** use signed Supabase Storage URLs (`/api/storage/evidence/sign-upload`, `/api/storage/signed-url`) so candidates never hand raw credentials to the browser.

---

## 🪪 Skill Passport

A Skill Passport is the candidate's verifiable record of confirmed skills, experience, and credentials.

- **Passport ID** — issued per candidate (e.g. `SP-BD-…`)
- **QR code** — generated client-side via `qrcode.react`; scanning opens the public verification portal
- **Public verification** — anyone can verify a passport at [/verify](https://skillproof.top/verify) by ID or by scanning the QR
- **Share toolbar** — shareable URLs and Open Graph metadata
- **Verified skill badges** — only skills that pass admin review are listed as verified
- **PDF / printable view** — passport card layout is rendered and exportable

Legacy URLs (`/passport/:id`, `/profile/:id`, `/certificate/:id`) are redirected to the unified `/verify` portal so old share links and QR codes still work.

---

## 💼 Job Portal

- Candidates browse jobs at [Job Portal](https://skillproof.top/dashboard/jobs) and open job details at `/dashboard/jobs/:jobId`.
- Companies create, edit, list, and manage jobs at [Job Management](https://skillproof.top/company/jobs).
- Applications are reviewed under [Applications](https://skillproof.top/company/applications).
- Shortlist, interviews, and messaging follow application status.
- A **Job Match** endpoint produces a match score per (candidate, job). It is best treated as a scoring aid — not as a hard filter.

---

## 🎤 Interview System

SkillProof supports an end-to-end interview flow:

1. **Schedule** — company schedules an interview from the candidate's application.
2. **Session start** — candidate starts the interview; the question is generated server-side.
3. **Live Q&A** — questions stream via Supabase realtime channels (`subscribeInterviewQuestions`, `subscribeInterviewAnswers`).
4. **Answer grading** — each answer is graded by the AI mentor service (`/api/interview/grade-answer`).
5. **Final evaluation** — a final session evaluation is generated (`evaluateInterviewFinal`).
6. **Report** — a downloadable report is available at `/dashboard/mentor/report/:sessionId` (`interviewReportDownload.ts`).

> The dedicated **AI Interview simulator** UI at `/dashboard/mentor` is currently marked **Coming Soon** in the codebase. The underlying interview service (`/api/mentor/*`, `/api/interview/*`) is implemented and used by the company-scheduled interview flow.

---

## 💬 Messaging

Candidate ↔ company messaging is implemented in `src/services/messaging.ts` and surfaces on both sides:

- Candidate: [Messages](https://skillproof.top/dashboard/messages)
- Company: [Messages](https://skillproof.top/company/messages)

Realtime updates are wired through Supabase realtime channels.

---

## 📱 Android Application

The SkillProof Android application is distributed as a direct APK download from the production site.

> **The APK is hosted on the official site and is not currently listed on Google Play.**

[⬇️ Download SkillProof APK](https://skillproof.top/SkillProof.apk?v=dev)

- **File:** `SkillProof.apk`
- **MIME:** `application/vnd.android.package-archive`
- **Source path in repo:** `public/SkillProof.apk`

---

## 🧩 Technology Stack

The frontend is a **React 19 + TypeScript + Vite 6** single-page application. The backend is split between **Supabase** (auth, database, storage, realtime) and a **PHP AI Gateway** deployed alongside the frontend.

| Layer | Technology |
| --- | --- |
| **Framework** | React 19, React Router 7 |
| **Language** | TypeScript 5.8 |
| **Build / Dev Server** | Vite 6 |
| **Styling** | Tailwind CSS 4 (`@tailwindcss/vite`) |
| **Animation** | `motion` (Framer Motion successor) |
| **Icons** | `lucide-react` |
| **Backend (BaaS)** | Supabase (`@supabase/supabase-js` 2.x) — auth, Postgres, storage, realtime |
| **AI Backend (separate)** | PHP AI Gateway (`/skillproof-api/api/`) — Supabase service role + AI provider integration |
| **AI Provider** | External AI provider (configured server-side); used for natural-language explanations. Deterministic scoring is in-house. |
| **PDF Generation** | `jspdf`, `html2canvas` (client-side rendering) |
| **PDF Parsing** | `pdfjs-dist` |
| **DOCX Parsing** | `mammoth` |
| **QR Codes** | `qrcode.react` |
| **Validation** | `zod` |
| **Env / Config** | `dotenv` |
| **Speech I/O (interview)** | `useSpeechSynthesis`, `useVoiceInput` (Web APIs) |
| **Subscription / OTP** | `bdapps` (Bangladesh SMS OTP provider) — used by `services/bdapps.ts` |
| **Internationalization** | Built-in `LanguageContext` (English / বাংলা) |
| **Deployment** | cPanel + Apache (shared hosting) — see `deploy/README.md` |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                          Browser (SPA)                             │
│   React 19 + TypeScript + Vite  + Tailwind 4  +  React Router 7    │
│                                                                    │
│   src/pages ─┬─ public/landing, /verify, /about, /how-it-works     │
│             ├─ user/dashboard/* (Candidate Portal)                 │
│             ├─ company/* (Company Portal)                          │
│             └─ admin/* (Admin Portal)                              │
│                                                                    │
│   src/context ─── Auth, CompanyAuth, Subscription,                 │
│                   CompanySubscription, Language                    │
│   src/services ── API clients, Supabase queries, realtime,         │
│                   AI/ML features, messaging, jobs, passports       │
│   src/lib ─────── Supabase client (browser-side, anon key)         │
│   src/config ─── API base URL, APK metadata                        │
└──────────────┬─────────────────────────────────────────────────────┘
               │
               │  (1) Supabase (anon key, RLS-protected)
               ▼
        ┌──────────────────────┐
        │      Supabase        │
        │  Auth · Postgres ·   │
        │  Storage · Realtime  │
        └──────────────────────┘

               │
               │  (2) Bearer auth (user session)
               ▼
┌────────────────────────────────────────────────────────────────────┐
│                  PHP AI Gateway (/skillproof-api/api)              │
│   index.php  →  _bootstrap, _supabase, _extract, …                 │
│   lib/                                                              │
│     • ml_engine.php      (deterministic scoring)                   │
│     • ml_v2_profile.php  (loads user context)                      │
│     • groq_client.php    (AI provider client, server-side only)    │
│     • bd_market.php, course_suggestions.php, career_simulation.php │
│   Endpoints:                                                        │
│     /api/ai-career-intelligence                                     │
│     /api/ai-center/{latest,course-suggestions,v2/predict-v2,…}      │
│     /api/ai-intelligence/{latest,generate,refresh}                  │
│     /api/profile-review · /api/parse-cv                             │
│     /api/mentor/* · /api/interview/*                                │
│     /api/career-analysis · /api/job-match/run                       │
│     /api/generate-assessment · /api/storage/*                       │
│     /api/employer/verify · /api/health                              │
└────────────────────────────────────────────────────────────────────┘
```

The PHP AI Gateway uses the **Supabase service role key** to read/write data that the browser anon key cannot, and holds the **AI provider key** server-side. Neither is ever shipped to the browser bundle.

---

## 📁 Project Structure

```
skillproof/
├── index.html                  # SPA entry, OG/SEO meta, brand icons
├── package.json                # scripts + deps (React 19, Vite 6, Supabase, …)
├── vite.config.ts              # dev proxy for /api → local PHP server
├── tsconfig.json               # TS config (paths alias @/*)
├── public/                     # static assets served as-is
│   ├── SkillProof.apk          # Android APK
│   ├── brand/                  # logo, favicon, apple-touch-icon, …
│   ├── partner/                # partner logos
│   └── apk/                    # APK-related static assets
├── docs/
│   └── screenshots/            # (reserved) UI screenshots
├── src/
│   ├── main.tsx                # React entry
│   ├── App.tsx                 # routes, providers, layout shells
│   ├── index.css               # Tailwind + custom styles
│   ├── components/             # presentational + layout components
│   │   ├── auth/               # ProtectedRoute, SubscriptionGuard, …
│   │   ├── layout/             # UserLayout, AdminLayout, CompanyLayout, sidebars, navbar, footer
│   │   ├── career/             # Career Intelligence UI primitives
│   │   ├── passport/           # Passport card, share toolbar, badges
│   │   ├── interview/          # CameraPreview, InterviewerAvatar, PremiumInterviewRoom
│   │   ├── verify/             # Credential panel, share buttons
│   │   ├── admin/              # Admin CRUD table, dashboard cards
│   │   ├── company/            # Company job form, schedule interview modal
│   │   ├── user/, dashboard/, public/, common/, ui/, error/, profile/, messaging/, certificate/
│   ├── pages/                  # route components
│   │   ├── public/             # Landing, About, HowItWorks, EmployerVerificationPortal, public jobs
│   │   ├── auth/               # Login, Register, Forgot/Reset password, Subscription, OTP
│   │   ├── user/               # Candidate dashboard pages (see Candidate Portal above)
│   │   ├── company/            # Company portal pages (see Company Portal above)
│   │   └── admin/              # Admin portal pages (see Admin Portal above)
│   ├── context/                # React contexts (auth, company auth, subscriptions, i18n)
│   ├── hooks/                  # Custom React hooks (useDashboardCounts, useVoiceInput, …)
│   ├── services/               # API + Supabase data-access layer (50+ modules)
│   ├── lib/                    # Supabase browser client(s)
│   ├── config/                 # API base URL + APK constants
│   ├── utils/                  # URL helpers, share helpers, YouTube helpers, …
│   ├── data/                   # local seed data
│   └── types/                  # shared TypeScript types
├── supabase/                   # SQL migrations + seed (kept outside the public bundle)
│   └── migrations/             # versioned schema migrations
└── deploy/                     # cPanel deployment artifacts (kept outside the public bundle)
    ├── public_html/            # frontend build artifacts
    └── skillproof-api/         # PHP AI Gateway build artifacts
```

---

## 🔐 Authentication & Authorization

SkillProof runs three independent auth surfaces that share Supabase but route into different portals:

| Surface | Mechanism | Routes |
| --- | --- | --- |
| **Candidate Auth** | Supabase email/password + Supabase OTP + Bangladesh SMS OTP (`bdapps`) | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/subscription`, `/subscription/otp` |
| **Company Auth** | Separate Supabase client (`supabaseCompany`) + Bangladesh SMS OTP | `/company/login`, `/company/verify`, `/company/subscription`, `/company/subscription/otp`, `/company/pending` |
| **Admin Auth** | Supabase + role check via `rbac.ts` + `AdminRoute` | `/admin/*` (gated by `admin` / `super_admin` role) |

Route guards:

- `ProtectedRoute` — blocks unauthenticated users on candidate routes.
- `CompanyProtectedRoute` — gates the company portal behind company auth + verification + subscription.
- `SubscriptionGuard` — enforces an active subscription before showing the candidate dashboard.
- `AdminRoute` — enforces the admin role on `/admin/*`.
- `PublicOnlyRoute` — keeps logged-in users out of the marketing pages.

Session tokens are exchanged with the PHP AI Gateway via `Authorization: Bearer <access_token>` (`src/config/api.ts` → `authHeaders`).

---

## 🔒 Security

Mechanisms actually present in the codebase:

- **Supabase Row Level Security (RLS)** — all candidate/company/admin data lives behind RLS policies in Postgres.
- **Anonymous-only browser key** — `VITE_SUPABASE_ANON_KEY` is the only Supabase credential the browser holds. The `service_role` key is **server-side only** and never prefixed with `VITE_`.
- **Server-side AI provider key** — the AI provider key lives in the PHP gateway only; the browser never sees it.
- **Signed-URL storage uploads** — evidence and resume files are uploaded through short-lived signed URLs (`/api/storage/evidence/sign-upload`, `/api/storage/resume/sign-upload`, `/api/storage/signed-url`).
- **Route protection + role checks** — see [Authentication & Authorization](#-authentication--authorization).
- **Session-aware API client** — `safeFetchJson` surfaces `ApiHtmlResponseError` and `ApiNetworkError` so misconfigured backend URLs fail loudly instead of silently returning HTML.
- **Bangladesh SMS OTP** — phone verification for company accounts uses `bdapps`, configured via `services/bdapps.ts`.
- **Security-hardened `.env.example`** — committed placeholders only; real secrets live in deployment-only `.env` files (see `.gitignore`).

> **Never commit secrets.** `.env`, `/deploy/`, `/supabase/`, and `/backend bdapps/` are git-ignored. See `.env.example` for the public variable names.

---

## ⚙️ Environment Variables

All variables below are placeholders in `.env.example`. Real values are injected by each environment (developer machine, staging, cPanel production) and **must remain outside Git**.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | ✅ | Public Supabase project URL (browser-safe). |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Public Supabase anonymous key (browser-safe; RLS still applies). |
| `VITE_PUBLIC_URL` | ✅ | Public origin used by QR codes, share links, and Open Graph metadata. |
| `VITE_API_URL` | 🟡 | Override for the PHP AI Gateway base URL. Leave empty to use the production default `https://skillproof.top/skillproof-api`. |
| `VITE_SUPER_ADMIN_EMAIL` | 🟡 | Designates the bootstrap super-admin email (development convenience). |
| `SUPABASE_URL` | ✅ (server) | Server-side Supabase URL used by the PHP AI Gateway. |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ (server) | Server-side Supabase service-role key. **Never prefix with `VITE_`.** |
| `GROQ_API_KEY` | 🟡 (server) | AI provider key. Optional — without it, the AI gateway falls back to deterministic responses with `degraded: true`. |
| `SUPER_ADMIN_EMAIL` | 🟡 (server) | First account matching this email is promoted to `super_admin`. |

See `deploy/README.md` for the cPanel deployment-time copy of these variables.

---

## 🚀 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy the example env and fill in your Supabase + AI provider credentials
cp .env.example .env

# 3. Run the frontend dev server (http://localhost:5173 by default)
npm run dev

# 4. (Optional) Run the local PHP AI Gateway alongside Vite
#    Vite's dev server proxies /api/* to 127.0.0.1:8765
npm run dev:api
```

### npm scripts (from `package.json`)

| Script | Command | Purpose |
| --- | --- | --- |
| `npm run dev` | `vite` | Start the Vite dev server. |
| `npm run dev:api` | `php -S 127.0.0.1:8765 -t deploy/_build/staging_api/api deploy/_build/staging_api/api/index.php` | Start the local PHP AI Gateway on port 8765 (proxied by Vite at `/api/*`). |
| `npm run build` | `vite build` | Produce a production build into `dist/`. |
| `npm run preview` | `vite preview` | Serve the built bundle locally. |
| `npm run clean` | `rm -rf dist` | Remove the build output. |
| `npm run lint` | `tsc --noEmit` | Type-check the project without emitting. |

> The PHP dev server requires PHP 7.4+ available on your `PATH`. Local API artifacts under `deploy/_build/` are not committed (see `.gitignore`).

---

## 🏭 Production Build

```bash
npm run build
```

- Output directory: **`dist/`** (configured in `vite.config.ts`).
- Sourcemaps are disabled (`sourcemap: false`).
- `emptyOutDir: false` — build will not wipe previously deployed assets under `dist/`.
- Final SPA is a static bundle suitable for any Apache/Nginx static host with HTML5 history fallback.

The PHP AI Gateway is **built and packaged separately** as `skillproof-api.tar.gz` and deployed alongside the static bundle (see `deploy/README.md`).

---

## 🌐 Deployment

SkillProof is deployed as a **cPanel shared-hosting** stack:

1. **Frontend archive** (`skillproof-frontend.tar.gz`) — uploaded and extracted into `public_html/`.
2. **API archive** (`skillproof-api.tar.gz`) — extracted into `public_html/skillproof-api/`.
3. **`.env`** — created from `skillproof-api/.env.example` and filled with the server-side secrets (Supabase service role key, optional AI provider key).
4. **Supabase migrations** — applied to the Supabase project from `supabase/migrations/`.

Production domain: **[https://skillproof.top](https://skillproof.top)**

> The full step-by-step deployment guide, including Apache `.htaccess` configuration, Supabase migration application, and verification checks, lives in [`deploy/README.md`](./deploy/README.md).

Production deployment configuration (hosting credentials, server-side `.env`, and the build archives) is **maintained separately and is not included in the public repository**.

---

## 📸 Screenshots

A `docs/screenshots/` directory is reserved for UI screenshots but is not yet populated in this commit. Add PNG/JPG files there and reference them like:

```markdown
![SkillProof Dashboard](docs/screenshots/dashboard.png)
```

Suggested filenames once captured:

- `dashboard.png`, `profile.png`, `skillproof-ml.png`, `roadmap.png`,
  `passport.png`, `verify.png`, `mentor.png`, `jobs.png`,
  `company-dashboard.png`, `admin-dashboard.png`, `employer-verify.png`,
  `landing.png`, `mobile.png`.

---

## 🗺️ Roadmap

### ✅ Implemented

- [x] Candidate dashboard, profile, roadmap, passport, verify, jobs, interviews, messages, settings
- [x] Company portal with job posting, candidate search, applications, shortlist, interviews, messages
- [x] Admin portal: taxonomy, users, companies, jobs, skill verification, assessment review,
      passport review/renewals, roadmap templates/completion/module exams, course certificates,
      audit logs, analytics, governance, employer verification, admin settings
- [x] Public verification portal at `/verify` (ID + QR lookup)
- [x] Public job listings at `/company-jobs`
- [x] Career Intelligence v2 (deterministic weighted-feature ML)
- [x] AI-assisted explanations via configured AI provider (with deterministic fallback)
- [x] CV parsing, profile review, career analysis, job match scoring
- [x] Interview sessions with realtime Q&A, AI answer grading, downloadable report
- [x] Messaging between candidates and companies
- [x] Bangladesh SMS OTP verification for candidates and companies
- [x] Android APK distribution

### 🟡 Coming Soon

- [ ] Full **AI Interview** simulator experience (UI shell exists; flow is currently locked)
- [ ] **Career Simulation** / What-If Analysis (service stubs in place)
- [ ] Legacy **AI Center v1** cards alongside the v2 dashboard

### 🔵 Planned

- [ ] Google Play Store distribution of the Android app
- [ ] Public roadmap & changelog
- [ ] Expanded employer-side analytics
- [ ] Localization beyond English / বাংলা

---

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/your-feature`.
3. Install dependencies: `npm install`.
4. Run the dev server: `npm run dev`.
5. Type-check before committing: `npm run lint`.
6. Keep changes focused; follow the existing module layout
   (`src/pages/<area>/*`, `src/services/*`, `src/components/<area>/*`).
7. **Never commit secrets.** Use `.env` (git-ignored) for local overrides.
8. Open a pull request describing the change, the user-visible impact, and any new env vars.

---

## 📄 License

**License: Not currently specified.**

No `LICENSE` file is present in this repository at the time of writing. Until a license is added, treat the source as **all rights reserved** by the project owner.

---

## 📞 Contact

- **Website:** [https://skillproof.top](https://skillproof.top)
- **Public verification portal:** [https://skillproof.top/verify](https://skillproof.top/verify)
- **Android APK:** [https://skillproof.top/SkillProof.apk?v=dev](https://skillproof.top/SkillProof.apk?v=dev)

> Additional contact channels (support email, social links) are shown on the production site when available.
