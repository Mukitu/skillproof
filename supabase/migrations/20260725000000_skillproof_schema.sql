-- SkillProof Relational Database Schema & RLS Policies
-- Target DB: Supabase / PostgreSQL
-- Generated for SkillProof Bangladesh Product

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. CORE TABLES
-- ==========================================

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  avatar_url TEXT,
  phone TEXT,
  location TEXT,
  bio TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SUB-CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.sub_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT sub_categories_category_slug_unique UNIQUE(category_id, slug)
);

-- SKILLS TABLE
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sub_category_id UUID REFERENCES public.sub_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  max_level INT DEFAULT 3 CHECK (max_level >= 1 AND max_level <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. CAREER & ROADMAP TABLES
-- ==========================================

-- CAREER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.career_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  headline TEXT,
  summary TEXT,
  extracted_data JSONB DEFAULT '{}'::jsonb,
  resume_url TEXT,
  years_experience INT DEFAULT 0,
  preferred_roles TEXT[] DEFAULT '{}',
  missing_skills TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CAREER ROADMAPS TABLE
CREATE TABLE IF NOT EXISTS public.career_roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sub_category_id UUID REFERENCES public.sub_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  goal TEXT,
  total_days INT NOT NULL CHECK (total_days > 0),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CAREER ROADMAP MODULES TABLE
CREATE TABLE IF NOT EXISTS public.career_roadmap_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID NOT NULL REFERENCES public.career_roadmaps(id) ON DELETE CASCADE,
  day_number INT NOT NULL CHECK (day_number > 0),
  title TEXT NOT NULL,
  description TEXT,
  key_concepts TEXT[] DEFAULT '{}',
  tasks TEXT[] DEFAULT '{}',
  unlock_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_roadmap_day UNIQUE(roadmap_id, day_number)
);

-- CAREER ROADMAP PROGRESS TABLE
CREATE TABLE IF NOT EXISTS public.career_roadmap_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  roadmap_id UUID NOT NULL REFERENCES public.career_roadmaps(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.career_roadmap_modules(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_module_progress UNIQUE(user_id, module_id)
);

-- ==========================================
-- 3. SKILL VERIFICATION: CODING CHALLENGES
-- ==========================================

-- CODING CHALLENGES TABLE
CREATE TABLE IF NOT EXISTS public.coding_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sub_category_id UUID REFERENCES public.sub_categories(id) ON DELETE SET NULL,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
  level INT NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 5),
  input_description TEXT,
  output_description TEXT,
  constraints TEXT,
  examples JSONB DEFAULT '[]'::jsonb,
  starter_code JSONB DEFAULT '{}'::jsonb,
  supported_languages TEXT[] DEFAULT ARRAY['python', 'javascript', 'cpp'],
  time_limit INT DEFAULT 2000, -- milliseconds
  memory_limit INT DEFAULT 256, -- megabytes
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CODING TEST CASES TABLE
CREATE TABLE IF NOT EXISTS public.coding_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.coding_challenges(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_hidden BOOLEAN DEFAULT TRUE,
  weight INT DEFAULT 1 CHECK (weight >= 1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CODING SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.coding_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.coding_challenges(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Runtime Error', 'Compilation Error', 'Pending')),
  score NUMERIC DEFAULT 0,
  runtime_ms INT DEFAULT 0,
  test_cases_passed INT DEFAULT 0,
  total_test_cases INT DEFAULT 0,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CODING SUBMISSION RESULTS TABLE
CREATE TABLE IF NOT EXISTS public.coding_submission_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.coding_submissions(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES public.coding_test_cases(id) ON DELETE CASCADE,
  passed BOOLEAN NOT NULL,
  actual_output TEXT,
  execution_time_ms INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. SKILL VERIFICATION: PROJECT CHALLENGES
-- ==========================================

-- PROJECT CHALLENGES TABLE
CREATE TABLE IF NOT EXISTS public.project_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT[] NOT NULL DEFAULT '{}',
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
  level INT NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 5),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sub_category_id UUID REFERENCES public.sub_categories(id) ON DELETE SET NULL,
  deadline TIMESTAMPTZ,
  submission_requirements TEXT,
  github_required BOOLEAN DEFAULT TRUE,
  zip_allowed BOOLEAN DEFAULT TRUE,
  starter_template_url TEXT,
  judging_criteria TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROJECT SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.project_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.project_challenges(id) ON DELETE CASCADE,
  repository_url TEXT,
  uploaded_zip_path TEXT,
  description TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Changes Requested')),
  admin_decision TEXT CHECK (admin_decision IN ('Approved', 'Rejected', 'Changes Requested')),
  admin_feedback TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROJECT REVIEW NOTES TABLE (Internal Admin Notes)
CREATE TABLE IF NOT EXISTS public.project_review_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.project_submissions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 5. SKILL VERIFICATIONS & PASSPORTS
-- ==========================================

-- SKILL VERIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.skill_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  level INT NOT NULL CHECK (level >= 1),
  verification_type TEXT NOT NULL CHECK (verification_type IN ('coding_challenge', 'project_verification')),
  reference_id UUID NOT NULL,
  score NUMERIC NOT NULL DEFAULT 100,
  verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- SKILL PASSPORTS TABLE (1 Passport per user + skill)
CREATE TABLE IF NOT EXISTS public.skill_passports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  current_level INT NOT NULL DEFAULT 1 CHECK (current_level >= 1),
  verification_score NUMERIC DEFAULT 100,
  evidence_strength TEXT DEFAULT 'Strong' CHECK (evidence_strength IN ('Basic', 'Moderate', 'Strong', 'Verified Expert')),
  integrity_score NUMERIC DEFAULT 100,
  verification_count INT DEFAULT 1,
  last_verified_at TIMESTAMPTZ DEFAULT NOW(),
  public_id TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  title TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT TRUE,
  qr_code_data TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_skill_passport UNIQUE(user_id, skill_id)
);

-- SKILL PASSPORT HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.skill_passport_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id UUID NOT NULL REFERENCES public.skill_passports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  previous_level INT,
  new_level INT NOT NULL,
  verification_type TEXT NOT NULL,
  reference_id UUID,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 6. JOBS PORTAL
-- ==========================================

-- JOBS TABLE
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_logo TEXT,
  location TEXT NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('Full-time', 'Part-time', 'Remote', 'Contract', 'Internship')),
  salary_range TEXT NOT NULL,
  required_skills TEXT[] DEFAULT '{}',
  description TEXT NOT NULL,
  responsibilities TEXT[] DEFAULT '{}',
  requirements TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Closed', 'Draft')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SAVED JOBS TABLE
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_saved_job UNIQUE(user_id, job_id)
);

-- JOB APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Under Review', 'Interviewing', 'Accepted', 'Rejected')),
  cover_letter TEXT,
  resume_url TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_job_application UNIQUE(user_id, job_id)
);

-- ==========================================
-- 7. SYSTEM TABLES
-- ==========================================

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'passport_upgrade', 'project_review')),
  is_read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_sub_categories_category ON public.sub_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_skills_category ON public.skills(category_id);
CREATE INDEX IF NOT EXISTS idx_skills_sub_category ON public.skills(sub_category_id);

CREATE INDEX IF NOT EXISTS idx_roadmaps_user ON public.career_roadmaps(user_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_modules_roadmap ON public.career_roadmap_modules(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_progress_user ON public.career_roadmap_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_coding_challenges_skill ON public.coding_challenges(skill_id);
CREATE INDEX IF NOT EXISTS idx_coding_test_cases_challenge ON public.coding_test_cases(challenge_id);
CREATE INDEX IF NOT EXISTS idx_coding_submissions_user ON public.coding_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_coding_submissions_challenge ON public.coding_submissions(challenge_id);

CREATE INDEX IF NOT EXISTS idx_project_challenges_skill ON public.project_challenges(skill_id);
CREATE INDEX IF NOT EXISTS idx_project_submissions_user ON public.project_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_project_submissions_challenge ON public.project_submissions(challenge_id);

CREATE INDEX IF NOT EXISTS idx_passports_user ON public.skill_passports(user_id);
CREATE INDEX IF NOT EXISTS idx_passports_skill ON public.skill_passports(skill_id);
CREATE INDEX IF NOT EXISTS idx_passports_public_id ON public.skill_passports(public_id);
CREATE INDEX IF NOT EXISTS idx_passports_number ON public.skill_passports(passport_number);

CREATE INDEX IF NOT EXISTS idx_job_applications_user ON public.job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_job ON public.job_applications(job_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_roadmap_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_roadmap_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_submission_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_review_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_passports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_passport_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. PUBLIC READ ACCESSIBLE CATALOGS
CREATE POLICY "Public can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public can view sub_categories" ON public.sub_categories FOR SELECT USING (true);
CREATE POLICY "Public can view skills" ON public.skills FOR SELECT USING (true);
CREATE POLICY "Public can view published coding challenges" ON public.coding_challenges FOR SELECT USING (status = 'published');
CREATE POLICY "Public can view published project challenges" ON public.project_challenges FOR SELECT USING (status = 'published');
CREATE POLICY "Public can view active jobs" ON public.jobs FOR SELECT USING (status = 'Active');

-- 2. TEST CASE RLS: HIDE SECRET TEST CASES FROM NON-ADMINS
CREATE POLICY "Public can view non-hidden test cases" ON public.coding_test_cases
  FOR SELECT USING (is_hidden = false);

-- 3. PUBLIC SKILL PASSPORT VERIFICATION
CREATE POLICY "Public can view active skill passports" ON public.skill_passports
  FOR SELECT USING (status = 'active' AND is_verified = true);

CREATE POLICY "Public can view passport history" ON public.skill_passport_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.skill_passports sp 
      WHERE sp.id = passport_id AND sp.status = 'active'
    )
  );

-- 4. PRIVATE USER DATA ACCESS
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own career profile" ON public.career_profiles FOR SELECT USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own career profile" ON public.career_profiles FOR ALL USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view own roadmaps" ON public.career_roadmaps FOR SELECT USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own roadmaps" ON public.career_roadmaps FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view own roadmap modules" ON public.career_roadmap_modules FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.career_roadmaps r
    JOIN public.profiles p ON p.id = r.user_id
    WHERE r.id = roadmap_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage own roadmap progress" ON public.career_roadmap_progress FOR ALL USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view own coding submissions" ON public.coding_submissions FOR SELECT USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert coding submissions" ON public.coding_submissions FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view own project submissions" ON public.project_submissions FOR SELECT USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert project submissions" ON public.project_submissions FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view own job applications" ON public.job_applications FOR SELECT USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert job applications" ON public.job_applications FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- 5. ADMIN MANAGE POLICIES & PRIVATE ADMIN NOTES PROTECTION
CREATE POLICY "Admins full access profiles" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins full access categories" ON public.categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins full access sub_categories" ON public.sub_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins full access skills" ON public.skills FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins full access coding_challenges" ON public.coding_challenges FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins full access coding_test_cases" ON public.coding_test_cases FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins full access project_challenges" ON public.project_challenges FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins full access project_submissions" ON public.project_submissions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins full access project_review_notes" ON public.project_review_notes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins full access skill_passports" ON public.skill_passports FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins full access audit_logs" ON public.audit_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
