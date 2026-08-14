import React from 'react';
import { Link } from 'react-router-dom';
import {
  Code2,
  Smartphone,
  Brain,
  Layers,
  Rocket,
  GraduationCap,
  Globe,
  Database,
  Cpu,
  Server,
  ArrowRight,
  Sparkles,
  Quote,
  Mail,
  MapPin,
  ShieldCheck,
  Target,
  Wrench,
  Lightbulb,
  Heart,
} from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { usePageSEO } from '../../hooks/usePageSEO';

const OWNER_NAME = 'Mukitu Islam Nishat';
const OWNER_FULL_TITLE = 'Founder & Owner of SkillProof';
const SITE_URL = 'https://skillproof.top';

const WHAT_I_DO = [
  {
    icon: Code2,
    title: 'Full-Stack Development',
    description:
      'Building complete web applications from frontend interfaces to backend APIs, authentication, databases, and production deployment.',
  },
  {
    icon: Smartphone,
    title: 'Mobile Development',
    description:
      'Building cross-platform mobile applications using Flutter for Android and iOS.',
  },
  {
    icon: Brain,
    title: 'AI/ML Product Development',
    description:
      'Building practical AI-powered features and products with a focus on real-world usability rather than experimental prototypes only.',
  },
  {
    icon: Layers,
    title: 'Product Architecture',
    description:
      'Designing application architecture, database structures, authentication systems, APIs, admin systems, and scalable product foundations.',
  },
  {
    icon: Rocket,
    title: 'SaaS & Startup Development',
    description:
      'Turning product ideas into functional, production-ready digital platforms.',
  },
];

const APPROACH = [
  {
    icon: Target,
    title: 'Build Real Products',
    description:
      'I focus on building software that solves practical problems and can actually be used by people.',
  },
  {
    icon: Wrench,
    title: 'End-to-End Ownership',
    description:
      'I work across product planning, architecture, development, database design, APIs, UI, and deployment.',
  },
  {
    icon: Lightbulb,
    title: 'Continuous Learning',
    description:
      'As a CSE student and developer, I continuously learn new technologies and improve the products I build.',
  },
  {
    icon: Heart,
    title: 'Bangladesh First',
    description:
      'I have a strong interest in building technology products that are practical and relevant to the Bangladeshi ecosystem.',
  },
];

const TECH_CATEGORIES = [
  {
    icon: Code2,
    title: 'Web',
    items: 'React, TypeScript, Next.js, Node.js, Express.js',
  },
  {
    icon: Database,
    title: 'Database & Backend',
    items: 'PostgreSQL, Supabase, MongoDB, REST APIs',
  },
  {
    icon: Smartphone,
    title: 'Mobile',
    items: 'Flutter',
  },
  {
    icon: Brain,
    title: 'AI/ML',
    items: 'AI-powered application development and applied machine learning',
  },
  {
    icon: Server,
    title: 'Infrastructure',
    items: 'Production deployment, authentication, storage, APIs, and cloud/backend services',
  },
];

const SKILLPROOF_AREAS = [
  'Skill Verification',
  'Skill Passport',
  'Career Roadmaps',
  'Career Intelligence',
  'Job Portal',
  'Employer/Company Portal',
  'Assessment & Review',
  'Career Development',
];

export const OwnerPage: React.FC = () => {
  usePageSEO({
    title: `About ${OWNER_NAME} | Founder & Owner of SkillProof`,
    description: `Learn about ${OWNER_NAME}, Founder & Owner of SkillProof, a skill-verification and career development platform built for Bangladesh.`,
    path: '/owner',
    ogType: 'profile',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: OWNER_NAME,
      jobTitle: 'Founder & Owner',
      description:
        'Founding developer of SkillProof — a skill-verification and career development platform built for Bangladesh.',
      url: `${SITE_URL}/owner`,
      worksFor: {
        '@type': 'Organization',
        name: 'SkillProof',
        url: SITE_URL,
        sameAs: [SITE_URL],
      },
      knowsAbout: [
        'Full-Stack Web Development',
        'Cross-Platform Mobile Development',
        'AI/ML Product Development',
        'Product Architecture',
        'SaaS & Startup Development',
        'React',
        'TypeScript',
        'Node.js',
        'Express.js',
        'MongoDB',
        'PostgreSQL',
        'Supabase',
        'Next.js',
        'Flutter',
        'API development',
      ],
      alumniOf: {
        '@type': 'EducationalOrganization',
        name: 'B.Sc. in Computer Science & Engineering (CSE)',
      },
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'BD',
        addressLocality: 'Rajshahi',
      },
    },
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'About the Founder', url: '/owner' },
    ],
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1">
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-30"
            style={{
              background:
                'radial-gradient(60% 60% at 80% 20%, rgba(249,115,22,0.35) 0%, rgba(249,115,22,0) 60%), radial-gradient(50% 50% at 10% 90%, rgba(227,27,35,0.4) 0%, rgba(227,27,35,0) 60%)',
            }}
          />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-10 sm:pb-16">
            <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E31B23]/15 border border-[#E31B23]/30 text-[#F97316] text-xs font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>Founder & Owner</span>
                </div>

                <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
                  {OWNER_NAME}
                </h1>
                <p className="mt-3 text-base sm:text-lg text-slate-300 max-w-2xl">
                  {OWNER_FULL_TITLE} — building production software for web, mobile, and AI/ML.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#F97316]" /> Rajshahi, Bangladesh
                  </span>
                  <span className="hidden sm:inline-block h-3 w-px bg-slate-700" aria-hidden="true" />
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-[#F97316]" /> B.Sc. in CSE
                  </span>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <a
                    href={`mailto:support@skillproof.top?subject=Inquiry for ${encodeURIComponent(OWNER_NAME)}`}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white text-sm font-bold shadow-lg shadow-red-500/20 hover:opacity-95 transition-all"
                  >
                    <Mail className="w-4 h-4" /> Get in Touch
                  </a>
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm font-bold hover:border-[#F97316]/50 transition-all"
                  >
                    Visit SkillProof <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Portrait */}
              <div className="justify-self-center lg:justify-self-end">
                <div className="relative">
                  <div
                    aria-hidden="true"
                    className="absolute -inset-2 rounded-3xl opacity-60 blur-2xl"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(227,27,35,0.45) 0%, rgba(249,115,22,0.45) 50%, rgba(255,138,0,0.45) 100%)',
                    }}
                  />
                  <div className="relative h-44 w-44 sm:h-56 sm:w-56 lg:h-64 lg:w-64 rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
                    <img
                      src="/brand/owner.jpg"
                      alt={`Portrait of ${OWNER_NAME}, Founder & Owner of SkillProof`}
                      width={512}
                      height={640}
                      loading="eager"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Founder Introduction ───────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-5">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Founder & Owner</h2>
              <div className="space-y-4 text-sm sm:text-base text-slate-300 leading-relaxed">
                <p>
                  I'm {OWNER_NAME}, a Computer Science &amp; Engineering student and the Founder &amp; Owner of
                  SkillProof. I build production-focused software across full-stack web development,
                  cross-platform mobile applications, and applied AI/ML.
                </p>
                <p>
                  SkillProof is more than a website for me — it is a product that I designed, architected,
                  developed, and continue to build as a long-term platform for skill verification, structured
                  learning, and career development.
                </p>
                <p>
                  I believe in building real products rather than stopping at prototypes. My focus is on
                  turning ideas into usable, scalable, and production-ready software.
                </p>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="inline-flex items-center gap-2 text-[#F97316] text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verified Profile</span>
                </div>
                <p className="text-sm text-slate-300">
                  This is the official "Meet the Founder" page of SkillProof, owned and operated by{' '}
                  <span className="text-white font-bold">{OWNER_NAME}</span>.
                </p>
                <p className="text-xs text-slate-500">
                  For official communications, please use the official channels listed on the SkillProof
                  website.
                </p>
              </div>
            </aside>
          </div>
        </section>

        {/* ── What I Do ─────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="space-y-2 mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">What I Do</h2>
            <p className="text-sm text-slate-400 max-w-2xl">
              I work across the full stack of modern product development — from idea to deployment.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {WHAT_I_DO.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="p-5 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 hover:border-[#F97316]/50 transition-colors"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#E31B23]/20 to-[#F97316]/20 border border-[#F97316]/30">
                    <Icon className="w-5 h-5 text-[#F97316]" />
                  </div>
                  <h3 className="text-base font-bold text-white">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{item.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ── Building SkillProof ───────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="p-6 sm:p-10 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E31B23]/15 border border-[#E31B23]/30 text-[#F97316] text-xs font-bold">
              <Rocket className="w-4 h-4" />
              <span>Building SkillProof</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              A flagship product for Bangladesh
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
              SkillProof is my flagship product — a skill-verification and career development platform
              designed for the Bangladeshi market. The platform connects candidates, companies, and
              administrators in one ecosystem. Its goal is to help users demonstrate verified skills,
              follow structured career roadmaps, build a stronger professional profile, and connect with
              potential employers.
            </p>

            <div className="grid sm:grid-cols-2 gap-5 pt-2">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <p className="text-xs font-bold text-[#F97316] uppercase tracking-wider">Founder & Owner</p>
                <p className="text-base sm:text-lg font-bold text-white">{OWNER_NAME}</p>
              </div>
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <p className="text-xs font-bold text-[#F97316] uppercase tracking-wider">Product</p>
                <p className="text-base sm:text-lg font-bold text-white">SkillProof</p>
                <a
                  href={SITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-slate-300 hover:text-[#F97316] transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" /> {SITE_URL.replace('https://', '')}
                </a>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Core areas</p>
              <div className="flex flex-wrap gap-2">
                {SKILLPROOF_AREAS.map((area) => (
                  <span
                    key={area}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] text-white text-sm font-bold shadow-lg shadow-red-500/20 hover:opacity-95 transition-all"
              >
                Explore SkillProof <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Technology & Expertise ───────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="space-y-2 mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Technology & Expertise</h2>
            <p className="text-sm text-slate-400 max-w-2xl">
              A practical toolkit I use to design, build, and ship products.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {TECH_CATEGORIES.map((t) => {
              const Icon = t.icon;
              return (
                <article
                  key={t.title}
                  className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-[#F97316]/50 transition-colors"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#E31B23]/20 to-[#F97316]/20 border border-[#F97316]/30">
                    <Icon className="w-5 h-5 text-[#F97316]" />
                  </div>
                  <h3 className="text-base font-bold text-white">{t.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{t.items}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ── Education ─────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="space-y-2 mb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Education</h2>
          </div>

          <article className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#E31B23]/20 to-[#F97316]/20 border border-[#F97316]/30 shrink-0">
              <GraduationCap className="w-6 h-6 text-[#F97316]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-white">
                B.Sc. in Computer Science &amp; Engineering (CSE)
              </h3>
              <p className="text-sm text-slate-300">Currently pursuing</p>
            </div>
          </article>
        </section>

        {/* ── My Approach ───────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="space-y-2 mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">My Approach</h2>
            <p className="text-sm text-slate-400 max-w-2xl">
              Principles that guide how I design, build, and ship product work.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
            {APPROACH.map((p) => {
              const Icon = p.icon;
              return (
                <article
                  key={p.title}
                  className="p-5 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 hover:border-[#F97316]/50 transition-colors"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#E31B23]/20 to-[#F97316]/20 border border-[#F97316]/30">
                    <Icon className="w-5 h-5 text-[#F97316]" />
                  </div>
                  <h3 className="text-base font-bold text-white">{p.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">"{p.description}"</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ── Why I Built SkillProof ────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="relative p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 space-y-5">
            <div
              aria-hidden="true"
              className="absolute top-4 right-4 sm:top-6 sm:right-6 text-slate-800"
            >
              <Quote className="w-12 h-12 sm:w-16 sm:h-16" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E31B23]/15 border border-[#E31B23]/30 text-[#F97316] text-xs font-bold">
              <Heart className="w-4 h-4" />
              <span>Why I Built SkillProof</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Skills should be demonstrable, verifiable, and connected to real opportunities.
            </h2>

            <div className="space-y-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
              <p>
                I built SkillProof around a simple idea: skills should be demonstrable, verifiable, and
                connected to real career opportunities. Instead of relying only on certificates or
                self-declared skills, SkillProof aims to create a structured system where users can
                demonstrate their abilities through assessments, evidence, learning roadmaps, and verified
                credentials.
              </p>
              <p>
                This is an ongoing journey, and I am building SkillProof step by step with the goal of
                creating a useful technology platform for Bangladesh.
              </p>
            </div>

            <div className="pt-2 text-xs text-slate-500">
              — {OWNER_NAME}, Founder & Owner of SkillProof
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default OwnerPage;
