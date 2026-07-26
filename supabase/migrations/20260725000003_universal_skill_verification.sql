-- Migration: Add Universal Skill Verification tables and alter skill_passports
-- For dynamic assessments (Groq/Gemini), submission tracking, multi-file and multi-link uploads, and admin approval workflows.

-- 1. Create Universal Assessments Table
CREATE TABLE IF NOT EXISTS public.universal_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('coding', 'practical')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  evaluation_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_time TEXT,
  required_technologies TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Universal Submissions Table
CREATE TABLE IF NOT EXISTS public.universal_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.universal_assessments(id) ON DELETE CASCADE,
  submission_links JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. { "github": "...", "figma": "...", "behance": "...", "website": "..." }
  file_url TEXT, -- Supabase storage URL for ZIP/RAR/PDF/DOCX etc.
  file_name TEXT,
  description TEXT,
  status TEXT DEFAULT 'Pending Review' CHECK (status IN ('Pending Review', 'Passed', 'Failed')),
  score INT, -- 0 to 100
  strengths TEXT,
  weaknesses TEXT,
  improvement TEXT,
  feedback TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Alter skill_passports status check constraint to allow 'pending_approval' and reject feedback
ALTER TABLE public.skill_passports DROP CONSTRAINT IF EXISTS skill_passports_status_check;
ALTER TABLE public.skill_passports ADD CONSTRAINT skill_passports_status_check CHECK (status IN ('active', 'suspended', 'archived', 'pending_approval'));

-- Add optional columns to skill_passports for rejection details and metadata
ALTER TABLE public.skill_passports ADD COLUMN IF NOT EXISTS reject_reason TEXT;
ALTER TABLE public.skill_passports ADD COLUMN IF NOT EXISTS completed_projects JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.skill_passports ADD COLUMN IF NOT EXISTS admin_feedback TEXT;
ALTER TABLE public.skill_passports ADD COLUMN IF NOT EXISTS digital_signature TEXT;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.universal_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universal_submissions ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
-- Assessments
DROP POLICY IF EXISTS "Users can view their own assessments" ON public.universal_assessments;
CREATE POLICY "Users can view their own assessments" ON public.universal_assessments
  FOR SELECT USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own assessments" ON public.universal_assessments;
CREATE POLICY "Users can insert their own assessments" ON public.universal_assessments
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins full access assessments" ON public.universal_assessments;
CREATE POLICY "Admins full access assessments" ON public.universal_assessments
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Submissions
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.universal_submissions;
CREATE POLICY "Users can view their own submissions" ON public.universal_submissions
  FOR SELECT USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own submissions" ON public.universal_submissions;
CREATE POLICY "Users can insert their own submissions" ON public.universal_submissions
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins full access submissions" ON public.universal_submissions;
CREATE POLICY "Admins full access submissions" ON public.universal_submissions
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Update or ensure public read RLS policy on skill_passports
DROP POLICY IF EXISTS "Public can view active skill passports" ON public.skill_passports;
CREATE POLICY "Public can view active skill passports" ON public.skill_passports
  FOR SELECT USING (status = 'active' AND is_verified = true);

-- Enable Realtime
-- Use exception-handling or simple commands if exists
ALTER PUBLICATION supabase_realtime ADD TABLE public.universal_assessments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.universal_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.skill_passports;
