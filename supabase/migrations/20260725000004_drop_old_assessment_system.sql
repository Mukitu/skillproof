-- Migration 04 - Drop the old coding/project challenge assessment system.
-- Universal Assessment is now the only assessment system. This is a destructive migration.

BEGIN;

DROP TABLE IF EXISTS public.coding_submission_results CASCADE;
DROP TABLE IF EXISTS public.coding_submissions CASCADE;
DROP TABLE IF EXISTS public.coding_test_cases CASCADE;
DROP TABLE IF EXISTS public.coding_challenges CASCADE;
DROP TABLE IF EXISTS public.project_review_notes CASCADE;
DROP TABLE IF EXISTS public.project_submissions CASCADE;
DROP TABLE IF EXISTS public.project_challenges CASCADE;
DROP TABLE IF EXISTS public.skill_verifications CASCADE;

-- Remove from realtime publication if it was ever added.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.coding_challenges;
    ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.coding_test_cases;
    ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.coding_submissions;
    ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.coding_submission_results;
    ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.project_challenges;
    ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.project_submissions;
    ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.project_review_notes;
  END IF;
END $$;

COMMIT;
