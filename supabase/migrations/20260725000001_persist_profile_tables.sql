-- Migration: Add missing profile columns and create educations, experiences, and user_skills tables
-- Plus storage bucket configurations and policies

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ALTER PROFILES TABLE TO ADD MISSING COLUMNS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Male', 'Female', 'Other'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS division TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Bangladesh';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profession TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_position TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience_years INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience_summary TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS education_degree TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS education_institution TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS education_year TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS resume_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'Free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'bn' CHECK (language IN ('bn', 'en'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"email": true, "job_alerts": true, "verification_updates": true}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{"public_profile": true, "show_phone": true}'::jsonb;

-- Adjust role check constraint to allow super_admin
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin', 'super_admin'));

-- 2. CREATE EDUCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.educations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  degree TEXT NOT NULL,
  institution TEXT NOT NULL,
  year TEXT,
  cgpa TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE EXPERIENCES TABLE
CREATE TABLE IF NOT EXISTS public.experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  company TEXT NOT NULL,
  duration TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREATE USER_SKILLS TABLE (deduplicated skills list)
CREATE TABLE IF NOT EXISTS public.user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'technical', -- e.g. technical, soft, tools, languages
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_skill UNIQUE(user_id, name)
);

-- 5. ENABLE ROW LEVEL SECURITY (RLS) FOR NEW TABLES
ALTER TABLE public.educations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

-- 6. POLICIES FOR EDUCATIONS
CREATE POLICY "Users can view own educations" ON public.educations FOR SELECT USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own educations" ON public.educations FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update own educations" ON public.educations FOR UPDATE USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete own educations" ON public.educations FOR DELETE USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- 7. POLICIES FOR EXPERIENCES
CREATE POLICY "Users can view own experiences" ON public.experiences FOR SELECT USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own experiences" ON public.experiences FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update own experiences" ON public.experiences FOR UPDATE USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete own experiences" ON public.experiences FOR DELETE USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- 8. POLICIES FOR USER_SKILLS
CREATE POLICY "Users can view own user_skills" ON public.user_skills FOR SELECT USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own user_skills" ON public.user_skills FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update own user_skills" ON public.user_skills FOR UPDATE USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete own user_skills" ON public.user_skills FOR DELETE USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- 9. PROVISION STORAGE BUCKETS FOR AVATARS AND RESUMES
-- Create the 'profiles' storage bucket if it does not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

-- 10. SETUP ROW LEVEL SECURITY & POLICIES FOR STORAGE BUCKET
-- Read Access: Open to everyone for profile avatars & uploads
CREATE POLICY "Profiles storage public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'profiles');

-- Insert Access: Users can upload objects under their own user folder (auth.uid()) or with prefix matching
CREATE POLICY "Profiles storage authenticated insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profiles');

-- Update Access: Users can update objects in the profiles bucket
CREATE POLICY "Profiles storage authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profiles');

-- Delete Access: Users can delete objects in the profiles bucket
CREATE POLICY "Profiles storage authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profiles');
