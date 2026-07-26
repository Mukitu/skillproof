-- Migration 11 - Realtime publication + super-admin bootstrap helper.

BEGIN;

-- 1. Add all production tables to the realtime publication (idempotently).
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'categories','sub_categories','skills',
    'roadmap_templates','roadmap_template_days',
    'jobs','career_roadmaps','career_roadmap_modules','career_roadmap_progress',
    'skill_passports','universal_assessments','universal_submissions',
    'universal_assessment_evidence','profiles','audit_logs','notifications'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY tables LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END $$;

-- 2. Function to bootstrap a super_admin from an email (called by BFF or SQL seed).
CREATE OR REPLACE FUNCTION public.bootstrap_super_admin(target_email TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles
  SET role = 'super_admin', role_status = 'active', updated_at = NOW()
  WHERE email = target_email AND role <> 'super_admin';
END;
$$;

COMMENT ON FUNCTION public.bootstrap_super_admin(TEXT) IS
  'Promote a profile to super_admin by email. Idempotent.';

COMMIT;
