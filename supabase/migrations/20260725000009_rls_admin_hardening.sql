-- Migration 09 - RLS admin hardening: replace role='admin' with IN ('admin','super_admin') everywhere.

BEGIN;

-- Helper function to centralise the admin check.
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

-- profiles
DROP POLICY IF EXISTS "Admins full access profiles" ON public.profiles;
CREATE POLICY "Admins full access profiles" ON public.profiles
  FOR ALL USING (public.is_admin());

-- categories
DROP POLICY IF EXISTS "Admins full access categories" ON public.categories;
CREATE POLICY "Admins full access categories" ON public.categories
  FOR ALL USING (public.is_admin());

-- sub_categories
DROP POLICY IF EXISTS "Admins full access sub_categories" ON public.sub_categories;
CREATE POLICY "Admins full access sub_categories" ON public.sub_categories
  FOR ALL USING (public.is_admin());

-- skills
DROP POLICY IF EXISTS "Admins full access skills" ON public.skills;
CREATE POLICY "Admins full access skills" ON public.skills
  FOR ALL USING (public.is_admin());

-- educations, experiences, user_skills (admin can read for review)
DROP POLICY IF EXISTS "Admins read educations" ON public.educations;
CREATE POLICY "Admins read educations" ON public.educations
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins read experiences" ON public.experiences;
CREATE POLICY "Admins read experiences" ON public.experiences
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins read user_skills" ON public.user_skills;
CREATE POLICY "Admins read user_skills" ON public.user_skills
  FOR SELECT USING (public.is_admin());

-- career_roadmaps, modules, progress (admin can read + manage)
DROP POLICY IF EXISTS "Admins full access roadmap" ON public.career_roadmaps;
CREATE POLICY "Admins full access roadmap" ON public.career_roadmaps
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access roadmap modules" ON public.career_roadmap_modules;
CREATE POLICY "Admins full access roadmap modules" ON public.career_roadmap_modules
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access roadmap progress" ON public.career_roadmap_progress;
CREATE POLICY "Admins full access roadmap progress" ON public.career_roadmap_progress
  FOR ALL USING (public.is_admin());

-- career_profiles
DROP POLICY IF EXISTS "Admins read career_profiles" ON public.career_profiles;
CREATE POLICY "Admins read career_profiles" ON public.career_profiles
  FOR SELECT USING (public.is_admin());

-- jobs
DROP POLICY IF EXISTS "Admins full access jobs" ON public.jobs;
CREATE POLICY "Admins full access jobs" ON public.jobs
  FOR ALL USING (public.is_admin());

-- saved_jobs (admin can read)
DROP POLICY IF EXISTS "Admins read saved_jobs" ON public.saved_jobs;
CREATE POLICY "Admins read saved_jobs" ON public.saved_jobs
  FOR SELECT USING (public.is_admin());

-- job_applications (admin can read + manage)
DROP POLICY IF EXISTS "Admins full access job_applications" ON public.job_applications;
CREATE POLICY "Admins full access job_applications" ON public.job_applications
  FOR ALL USING (public.is_admin());

-- notifications (admin can read)
DROP POLICY IF EXISTS "Admins read notifications" ON public.notifications;
CREATE POLICY "Admins read notifications" ON public.notifications
  FOR SELECT USING (public.is_admin());

-- audit_logs
DROP POLICY IF EXISTS "Admins full access audit_logs" ON public.audit_logs;
CREATE POLICY "Admins full access audit_logs" ON public.audit_logs
  FOR ALL USING (public.is_admin());

-- skill_passports (admin can manage)
DROP POLICY IF EXISTS "Admins full access skill_passports" ON public.skill_passports;
CREATE POLICY "Admins full access skill_passports" ON public.skill_passports
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access passport_history" ON public.skill_passport_history;
CREATE POLICY "Admins full access passport_history" ON public.skill_passport_history
  FOR ALL USING (public.is_admin());

-- universal_assessments / submissions
DROP POLICY IF EXISTS "Admins full access assessments" ON public.universal_assessments;
CREATE POLICY "Admins full access assessments" ON public.universal_assessments
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access submissions" ON public.universal_submissions;
CREATE POLICY "Admins full access submissions" ON public.universal_submissions
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access evidence" ON public.universal_assessment_evidence;
CREATE POLICY "Admins full access evidence" ON public.universal_assessment_evidence
  FOR ALL USING (public.is_admin());

COMMIT;
