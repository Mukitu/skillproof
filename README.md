# SkillProof

**AI-Powered Skill Verification & Career Platform for Bangladesh**

[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase&logoColor=white)](https://supabase.com)
[![PHP](https://img.shields.io/badge/PHP-8.2-777bb4?logo=php&logoColor=white)](https://www.php.net)
[![License](https://img.shields.io/badge/License-TBD-lightgrey)](#license)

🌐 **Live Production:** [https://skillproof.top](https://skillproof.top)

---

## 📋 Table of Contents

1. [Project Description](#-project-description)
2. [Main Purpose](#-main-purpose)
3. [Candidate Features](#-candidate-features)
4. [Company Features](#-company-features)
5. [Admin Features](#-admin-features)
6. [Public Features](#-public-features)
7. [AI Features](#-ai-features)
8. [Authentication](#-authentication)
9. [Skill Verification](#-skill-verification)
10. [Skill Passport](#-skill-passport)
11. [Job Portal](#-job-portal)
12. [Company Portal](#-company-portal)
13. [Admin Portal](#-admin-portal)
14. [Technology Stack](#-technology-stack)
15. [Architecture Overview](#-architecture-overview)
16. [Project Structure](#-project-structure)
17. [Local Development Setup](#-local-development-setup)
18. [Environment Variables](#-environment-variables)
19. [Running the Project](#-running-the-project)
20. [Build Commands](#-build-commands)
21. [Deployment Overview](#-deployment-overview)
22. [Security](#-security)
23. [Screenshots](#-screenshots)
24. [Future Development](#-future-development)
25. [Contributing](#-contributing)
26. [License](#-license)

---

## 📖 Project Description

**SkillProof** is a production-grade, AI-powered skill verification and career platform built specifically for the Bangladesh job market. It connects three audiences on a single platform:

- **Candidates** who want verifiable credentials and AI-powered career guidance
- **Companies** who need qualified, verified talent
- **Admins** who govern the skill taxonomy, review submissions, and keep the platform trustworthy

The platform issues portable, shareable **Skill Passports** — public, verifiable credentials that a candidate can show to any employer. An employer can verify a candidate's Skill Passport by ID, QR code, or email address without needing a SkillProof account.

The platform's AI features (powered by Groq) deliver resume parsing, career intelligence reports, AI-powered job matching, AI-graded interviews, and conversational career mentorship — all in both **Bengali** and **English**.

---

## 🎯 Main Purpose

SkillProof addresses three concrete problems in the Bangladesh hiring market:

1. **Skills claims are unverifiable.** Recruiters can't easily tell whether a candidate actually knows what they say they know. SkillProof issues verifiable Skill Passports backed by reviewed evidence (PDFs, images, project submissions).
2. **Career guidance is expensive and not personalized.** Groq-powered AI Mentor and AI Career Intelligence give every candidate an on-demand career advisor.
3. **Job discovery is shallow.** The Groq-powered Job Match Engine scores every candidate against every open job so the best fit rises to the top — not just whoever has the right keywords.

---

## 👤 Candidate Features

- **Authentication** — email/password sign-up, login, forgot/reset password via Supabase Auth
- **Universal Skill Assessment** — attempt any skill, upload PDF/image evidence, submit for AI grading
- **Skill Passport** — public, verifiable credential page with QR code and unique Passport ID
- **Career Profile** — auto-generated AI career profile with verified skills, evidence, and timeline
- **AI Career Center** — health check, latest prediction, prediction history, course suggestions, refresh
- **AI Career Intelligence v2** — pure-PHP career intelligence with sections
- **AI Mentor** — conversational AI career mentor with persistent session history
- **AI Career Profile** — generate, refresh, view career narrative
- **Career Roadmap** — learning path with lessons, modules, exams, and completion tracking
- **Job Portal** — browse public job listings, view AI Match Score, run matching against your profile (Groq-powered)
- **Job Detail & Apply** — view job, improve match with AI suggestions, apply with resume upload
- **Interview Module** — generate AI interview questions, answer, get graded, view interview reports
- **Invitations** — receive company invitations, accept/decline
- **Messaging** — direct messages with companies
- **Notifications** — in-app notification feed
- **Settings** — profile management, language toggle (Bengali / English), account settings
- **Profile Picture** — canvas-encoded avatar upload, security-safe re-encoding
- **Skill Passport PDF Download** — generate shareable PDF copy of your passport
- **Course Certificates** — earn and download course completion certificates

---

## 🏢 Company Features

- **Authentication** — email/password login + BDApps mobile OTP verification (Bangladesh)
- **Subscription Flow** — OTP-gated subscription page, controlled by BDApps master toggle
- **Company Dashboard** — KPIs: active jobs, applications, interviews, shortlisted candidates
- **Job Management** — create, edit, list, view detail, expire jobs
- **Candidate Search** — search candidates by skills, location, verification status
- **Applications Review** — accept, reject, shortlist applications
- **Interviews** — schedule, run AI-graded interviews with candidates
- **Shortlist** — curated shortlist of best-matched candidates
- **Profile** — company profile with branding
- **Settings** — company account settings
- **Messages** — direct messaging with candidates
- **Mobile Verification Status** — BDApps OTP-gated mobile verification

---

## 🛡️ Admin Features

- **Admin Dashboard** — KPIs across users, jobs, companies, audit logs
- **Users Management** — list, view detail, suspend/activate, change role, set premium, reset/send password
- **Companies Management** — list, approve, view mobile verification
- **Jobs Moderation** — review flagged jobs
- **Skill Verification Review** — review and approve/reject skill submissions and bundles
- **Roadmap Templates** — create and manage learning roadmaps (lessons, modules, exams)
- **Roadmap Completion Review** — review learner progress and exam submissions
- **Roadmap Module Exam Review** — review module-level exam answers
- **Taxonomy** — manage skill taxonomy, categories, safe-delete and reorder
- **Course Certificates** — manage course certificate templates and issuances
- **Passport Review** — review and approve Skill Passport applications
- **Passport Renewal** — handle passport renewal requests
- **Assessment Review** — review flagged assessments
- **Employer Verifications** — review employer verification requests
- **Governance** — manage platform governance settings (super-admin)
- **Audit Logs** — full audit trail with filters
- **Analytics** — platform analytics dashboards
- **Settings** — super-admin platform configuration

---

## 🌐 Public Features

- **Landing Page** — hero, profession cards, partner logos, featured jobs
- **About / How It Works** — static info pages
- **Public Job Board** — anyone can browse open jobs without signing up
- **Public Job Detail** — anyone can view a job without signing up
- **Employer Verification Portal** — verify a candidate's Skill Passport by ID / email / QR (no login required)
- **Skill Passport Public View** — `https://skillproof.top/passport/SP-BD-...` opens a public passport card
- **APK Download** — visitors can download the SkillProof Android app

---

## 🤖 AI Features

| Feature | Powered by | Endpoint |
|---|---|---|
| **AI Match Engine** (Job scoring) | Groq `llama-3.3-70b-versatile` | `POST /api/job-match/run` |
| **AI Mentor Chat** | Groq | `POST /api/mentor/chat` |
| **AI Career Center** | Groq | `GET /api/ai-center/*` |
| **AI Career Intelligence v2** | Groq | `GET /api/ai-career-intelligence` |
| **AI Career Profile** | Groq | `POST /api/profile-review` |
| **AI Interview Grader** | Groq | `POST /api/interview/grade-answer` |
| **CV Parsing** | Custom PHP + Groq | `POST /api/parse-cv` |
| **Career Simulation** | Groq | `GET /api/ai-intelligence/simulation` |
| **What-If Analysis** | Groq | `GET /api/ai-intelligence/what-if` |

All AI endpoints are authenticated, rate-limited via gateway retries, and log usage for admin analytics.

---

## 🔐 Authentication

- **Supabase Auth** — email + password, JWT session, refresh tokens
- **BDApps Mobile OTP** — Bangladesh mobile number verification for company sign-up
- **Role-Based Access Control** — `role` field on `profiles` table (`user`, `company`, `admin`, `super_admin`)
- **React Router guards** — `ProtectedRoute`, `AdminRoute`, `CompanyProtectedRoute`, `PublicOnlyRoute`, `SubscriptionGuard`
- **Service-role gate** — server-side uses Supabase service-role JWT only in PHP (`deploy/_build/staging_api/`)

---

## ✅ Skill Verification

- Candidates upload evidence (PDF, image) for a skill claim
- Submissions go to the admin Skill Verification Review queue
- Approved skills appear on the candidate's Skill Passport
- Pending submissions show in candidate's "My Skills" dashboard
- A submission review workflow with `pending → approved | rejected` transitions

---

## 🛂 Skill Passport

Every approved candidate gets a verifiable Skill Passport:

- **Public URL** — `https://skillproof.top/passport/<unique-id>`
- **QR Code** — scannable on the passport card
- **Verified Skills** — list of approved skills with evidence links
- **Career Timeline** — chronological career milestones
- **Share Toolbar** — copy link, share on social, generate PDF
- **PDF Download** — generate a printable PDF of the passport
- **Public Employer Verification** — anyone can verify by ID/email without signing up

---

## 💼 Job Portal

- Browse public jobs (`/company-jobs` and `/dashboard/jobs`)
- View job detail with full description, requirements, company info
- **AI Match Score** — Groq scores your profile against the job
- **Improve Match Drawer** — AI suggests concrete improvements to your resume/cover letter
- Apply with resume upload (PDF, image)
- Track application status in your dashboard
- Company-side review queue with accept/reject/shortlist actions

---

## 🏢 Company Portal

- 17 pages including OTP, dashboard, candidates, applications, jobs, shortlist, interviews, subscription
- Mobile verification via BDApps OTP
- Subscription flow with master toggle
- Full candidate search, application review, shortlist management, and AI-graded interview scheduler

---

## ⚙️ Admin Portal

- 19 pages covering users, companies, jobs, skill verification, roadmap templates, taxonomy, course certificates, passports, assessments, governance, audit logs, and analytics
- Super-admin promotion via `bootstrap_super_admin` Supabase function
- Soft-delete + audit log per action

---

## 🛠️ Technology Stack

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript 5.8 |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Routing | React Router 7 |
| State / Data | Context API + service layer |
| PDF Generation | `jspdf`, `html2canvas` |
| QR Codes | `qrcode.react` |
| CV Parsing | `mammoth`, `pdfjs-dist` |
| Validation | `zod` |
| Icons | `lucide-react` |
| Animations | `motion` |

### Backend (PHP AI Gateway — not in this repo, private)

| Layer | Technology |
|---|---|
| Runtime | PHP 8.2+ |
| Server | Apache / LiteSpeed (cPanel-compatible) |
| Routing | Custom `api/index.php` route table + `.htaccess` (RewriteRule + FallbackResource) |
| AI Provider | Groq (`llama-3.3-70b-versatile`) |
| Database Client | cURL → Supabase REST API + service-role JWT |

### Database / Auth / Storage

- **Supabase** (PostgreSQL 15) — Auth, RLS, Storage, Realtime
- **BDApps** — Bangladesh mobile OTP verification for company sign-up

---

## 🏛️ Architecture Overview

```
                         ┌──────────────────────────────────┐
                         │         Browser (React)           │
                         │   SkillProof SPA (React 19, Vite) │
                         └──────────────┬───────────────────┘
                                        │
                ┌───────────────────────┼────────────────────────┐
                │                       │                        │
        Public data (RLS)        Authenticated data (RLS)   Direct server calls
                │                       │                        │
                ▼                       ▼                        ▼
       ┌─────────────┐         ┌─────────────────┐      ┌────────────────────┐
       │  Supabase   │         │    Supabase     │      │   PHP AI Gateway   │
       │  REST API   │◄────────┤  Auth + JWT     │      │  /api/* (Apache)   │
       │  + RLS      │         │  (anon key)     │      │  Groq llama-3.3    │
       └──────┬──────┘         └────────┬────────┘      └─────────┬──────────┘
              │                         │                         │
              ▼                         ▼                         ▼
       ┌──────────────────────────────────────────────────────────────┐
       │                       PostgreSQL (Supabase)                  │
       │  profiles · jobs · applications · passports · skills · ...   │
       └──────────────────────────────────────────────────────────────┘
```

- **RLS** enforces row-level access on every table
- Service-role key is server-side only (PHP AI Gateway)
- SPA proxies `/api/*` to the PHP gateway during local development (`vite.config.ts`)

---

## 📁 Project Structure

```
skillproof/
├── src/                              # Frontend source (React + TypeScript + Vite)
│   ├── App.tsx                       # Router + provider tree
│   ├── main.tsx                      # Vite entry
│   ├── index.css                     # Tailwind layer
│   │
│   ├── components/                   # 71+ production components
│   │   ├── admin/                    # Admin portal UI
│   │   ├── auth/                     # ProtectedRoute, CompanyProtectedRoute, guards
│   │   ├── brand/                    # Brand-specific UI
│   │   ├── career/                   # Career timeline, brain panels
│   │   ├── certificate/              # Course certificate components
│   │   ├── common/                   # Shared reusable components
│   │   ├── company/                  # Company portal UI
│   │   ├── dashboard/                # Dashboard widgets
│   │   ├── error/                    # Error boundaries
│   │   ├── interview/                # Interview UI (candidate side)
│   │   ├── layout/                   # User/Admin/Company layouts + navbars + sidebars
│   │   ├── messaging/                # Messaging UI
│   │   ├── passport/                 # Skill Passport cards, badges, share, timeline
│   │   ├── profile/                  # Profile picture, profile UI
│   │   ├── public/                   # Public-facing components
│   │   ├── ui/                       # Headless UI primitives
│   │   ├── user/                     # User dashboard widgets
│   │   └── verify/                   # Public verification widgets
│   │
│   ├── context/                      # Auth, CompanyAuth, Subscription, CompanySubscription, Language
│   ├── hooks/                        # Custom hooks (useAdminTable, useDashboardCounts, useVoiceInput, useSpeechSynthesis)
│   ├── lib/                          # Supabase clients (anon + company-portal-isolated)
│   ├── pages/                        # 66 route components
│   │   ├── admin/                    # 19 admin pages
│   │   ├── auth/                     # 6 auth pages
│   │   ├── company/                  # 17 company pages
│   │   ├── public/                   # 6 public pages
│   │   └── user/                     # 18 user dashboard pages
│   │
│   ├── services/                     # 53 service modules
│   ├── types/                        # TypeScript database types
│   ├── utils/                        # Helpers (URL, share, YouTube, snapshot)
│   ├── config/                       # Static config (APK URL, etc.)
│   └── data/                         # Static data
│
├── public/                           # Vite static assets (copied to dist/)
│   ├── brand/                        # favicons, icons, logos
│   ├── partner/                      # partner logos
│   ├── apk/                          # APK download route
│   └── SkillProof.apk                # Android app binary
│
├── docs/
│   └── screenshots/                  # Place UI screenshots here (see below)
│
├── .env.example                      # Environment variable template (no real secrets)
├── .gitignore                        # GitHub-ready ignore rules
├── .htaccess.dist                    # Apache config template for cPanel
├── index.html                        # Vite entry HTML
├── package.json                      # Frontend dependencies + scripts
├── package-lock.json
├── tsconfig.json                     # TypeScript config
├── vite.config.ts                    # Vite config (with /api proxy for local dev)
└── README.md                         # This file
```

> **Note:** The `deploy/`, `supabase/`, and `backend bdapps/` directories exist locally as private deployment artifacts. They are NOT part of the GitHub repository and have been excluded via `.gitignore`.

---

## 🚀 Local Development Setup

### Prerequisites

- Node.js 20+ (Node 22 recommended)
- npm 10+
- A Supabase project (free tier works for local dev)

### Install

```bash
git clone <your-repo-url>
cd skillproof
npm install
```

### Configure environment

```bash
cp .env.example .env
# Edit .env and fill in:
#   VITE_SUPABASE_URL          -> your Supabase project URL
#   VITE_SUPABASE_ANON_KEY     -> your Supabase anon key
#   VITE_PUBLIC_URL            -> http://localhost:5173 (for local dev)
#   VITE_SUPER_ADMIN_EMAIL     -> the email that should be promoted to super_admin
#   (server-side keys go in deploy/_build/staging_api/.env)
```

> The frontend binds to `localhost:5173` by default. The PHP AI Gateway is not required for local UI work — Supabase REST handles all data queries. The PHP gateway is only needed if you want to test Groq-powered endpoints (Job Match, AI Mentor, etc.).

---

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL (public) |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key (public — RLS still applies) |
| `VITE_PUBLIC_URL` | ✅ | Public origin (used for QR codes, Open Graph) |
| `VITE_SUPER_ADMIN_EMAIL` | ⬜ | Email promoted to `super_admin` on first signup (if blank, fallback used) |
| `VITE_API_URL` | ⬜ | Optional — override PHP API origin (default: production URL) |
| `SUPABASE_URL` | server-side | Service-side Supabase URL (PHP API only) |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side | Service-role JWT (PHP API only — **never** prefix with `VITE_`) |
| `GROQ_API_KEY` | server-side | Groq API key for AI endpoints (PHP API only) |
| `SUPER_ADMIN_EMAIL` | server-side | Optional — bootstrap email (PHP API only) |

**Real secrets go in `.env` (gitignored). `.env.example` contains only placeholders.**

---

## ▶️ Running the Project

```bash
# Development (frontend only, uses Supabase REST for data)
npm run dev
# Opens on http://localhost:5173

# Development (with local PHP AI Gateway for Groq endpoints)
npm run dev:api
# Starts: php -S 127.0.0.1:8765 -t deploy/_build/staging_api/api deploy/_build/staging_api/api/index.php
# Vite proxies /api/* to it (see vite.config.ts)

# Type-check
npm run lint
# Runs: tsc --noEmit
```

---

## 🏗️ Build Commands

```bash
npm run build        # Vite production build → dist/
npm run preview      # Preview the production build locally
npm run clean        # rm -rf dist
npm run lint         # tsc --noEmit (type-check only)
```

### Build output

```
dist/
├── index.html
├── .htaccess                # SPA router (Vite-emitted)
├── assets/                  # Hashed JS + CSS chunks
├── brand/                   # Mirrored from public/
├── partner/                 # Mirrored from public/
├── apk/                     # Mirrored from public/
└── SkillProof.apk
```

| Output | Size (approx) |
|---|---|
| `dist/index.html` | 2 KB |
| `dist/assets/*.css` | ~180 KB |
| `dist/assets/*.js` | ~3 MB (gzip: ~720 KB) |
| `dist/SkillProof.apk` | 42 MB |
| Total `dist/` | ~50 MB |

---

## 🌐 Deployment Overview

Production deployment split into two archives:

1. **Frontend archive** — `dist/` uploaded to cPanel `public_html/`
2. **API archive** — PHP files uploaded to `public_html/skillproof-api/`

Server-side secrets live in:

- `public_html/skillproof-api/.env` (for the PHP AI Gateway)

### Routing

- **Frontend SPA** — `dist/.htaccess` handles React Router deep links
- **API** — `skillproof-api/.htaccess` uses `RewriteRule` + `FallbackResource` for maximum host compatibility

### Required Apache modules

- `mod_rewrite`, `mod_dir`, `mod_headers`, `mod_deflate`
- PHP 8.2+

### Required PHP extensions

- `curl`, `mbstring`, `openssl`, `json`

> Detailed step-by-step deployment instructions are kept locally (in `diploy.md` and `deploy/README.md`) and are excluded from the public GitHub repository.

---

## 🔒 Security

- **Row-Level Security (RLS)** is enforced on every Supabase table
- **Authentication** uses Supabase Auth (email + password, JWT-based sessions)
- **Authorization** is enforced at three layers:
  - Database (RLS policies)
  - Service-layer role gates (`src/services/rbac.ts`)
  - React Router route guards (`src/components/auth/`)
- **Secrets** are never committed — see `.env.example` for placeholder values
- **Security headers** (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `no-cache`) are set in both frontend and API `.htaccess` files
- **File upload** is restricted by Supabase storage RLS policies with MIME allowlists and size caps
- **Service-role JWT** lives only in server-side `.env`, never in frontend bundles
- **PHP API secrets** (`GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are supplied via `public_html/skillproof-api/.env` on the deployment host
- **BDApps credentials** are private, server-side only, and excluded from GitHub
- **Private deployment artifacts** (`deploy/`, `supabase/`, `backend bdapps/`) are local-only and excluded from GitHub via `.gitignore`

If you fork this repository, replace all placeholder values in `.env` and `.env.example` before deploying.

---

## 📸 Screenshots

The README references images from `docs/screenshots/`. To add screenshots to the public GitHub README, simply place the image files inside that directory using the filenames shown below — the README will display them automatically.

### Expected filenames

Place these images inside `docs/screenshots/`:

```
docs/screenshots/
├── landing.png
├── passport.png
├── job-portal.png
├── ai-career-center.png
├── company-dashboard.png
├── admin-dashboard.png
├── candidate-profile.png
└── employer-verify.png
```

### Sample README image references

These are the relative-path references used elsewhere in this README:

### Landing Page

![SkillProof Landing Page](docs/screenshots/landing.png)

### Skill Passport

![Skill Passport](docs/screenshots/passport.png)

### Job Portal

![Job Portal](docs/screenshots/job-portal.png)

### AI Career Center

![AI Career Center](docs/screenshots/ai-career-center.png)

### Company Dashboard

![Company Dashboard](docs/screenshots/company-dashboard.png)

### Admin Dashboard

![Admin Dashboard](docs/screenshots/admin-dashboard.png)

### Candidate Profile

![Candidate Profile](docs/screenshots/candidate-profile.png)

### Employer Verification Portal

![Employer Verification](docs/screenshots/employer-verify.png)

> **Tip:** PNG or JPG will render in GitHub READMEs. Once you place any of these files at the path shown, GitHub will pick them up and render them on the repository page automatically.

The `.gitkeep` file in `docs/screenshots/` is committed so the empty directory is preserved in version control until you add real screenshots.

---

## 🔭 Future Development

- [ ] Public candidate verification API for third-party integrations
- [ ] Mobile-first PWA install flow
- [ ] Real-time interview proctoring
- [ ] Multi-language support (Bangla, Hindi, English)
- [ ] Career trajectory simulator with time-series projections
- [ ] Recruiter analytics dashboard
- [ ] Skill marketplace for verified training providers

---

## 🤝 Contributing

This repository is the public source for the SkillProof production website. Internal deployment artifacts (`deploy/`, `supabase/`, `backend bdapps/`) live locally and are not part of the public source — please do not commit anything from those directories.

For issues or feature requests, please open a GitHub issue.

---

## 📄 License

License information can be added by the project owner.

---

<sub>🤖 Generated for review — features, technology, and architecture described in this README are based only on code that actually exists in the repository.</sub>