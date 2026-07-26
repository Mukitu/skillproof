-- Migration 44 - Fix "function gen_random_bytes(integer) does not exist".
--
-- Symptom: admin clicks "Save Review" on a Universal Assessment submission.
-- Server returns: "Could not review submission: function gen_random_bytes(integer)
--                 does not exist".
--
-- Root cause: the trigger trg_passport_after_submission (defined in migration
-- 12 and rewritten in migration 19) and fn_upsert_passport_eligibility_for
-- (migration 42) call encode(gen_random_bytes(N), 'hex'). gen_random_bytes()
-- ships with the pgcrypto extension, which was never enabled in this project.
-- Migration 43 already uses the safer extensions.gen_random_bytes form; the
-- older call sites resolve through the search_path and crash when the
-- function isn't installed.
--
-- This migration is idempotent and safe to run on existing data.
--
-- Fix:
--   1. Enable pgcrypto in the extensions schema.
--   2. Rewrite trg_passport_after_submission so it always uses the
--      schema-qualified extensions.gen_random_bytes() form.
--   3. Rewrite fn_upsert_passport_eligibility_for the same way.

BEGIN;

-- 1. Enable pgcrypto. The functions below now resolve whether or not
--    pgcrypto is later moved into the public schema.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Rewrite the universal-submission trigger so it can no longer crash.
--    DROP TRIGGER first so we can safely re-create the function body.
DROP TRIGGER IF EXISTS trg_passport_after_submission ON public.universal_submissions;
DROP TRIGGER IF EXISTS trg_passport_after_submission_insert ON public.universal_submissions;

CREATE OR REPLACE FUNCTION public.trg_passport_after_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  passed_count INT;
  v_skill_id UUID;
  v_user_id UUID;
  v_skill_name TEXT;
  v_existing_passport UUID;
  v_passport_number TEXT;
  v_public_id TEXT;
BEGIN
  -- Only act when the new state is 'Passed'.
  IF NEW.status <> 'Passed' THEN
    RETURN NEW;
  END IF;

  -- For UPDATE, only fire if the status actually transitioned.
  IF TG_OP = 'UPDATE' AND OLD.status = 'Passed' THEN
    RETURN NEW;
  END IF;

  v_user_id := NEW.user_id;
  SELECT ua.skill_id INTO v_skill_id
  FROM public.universal_assessments ua
  WHERE ua.id = NEW.assessment_id;
  IF v_skill_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT s.name INTO v_skill_name FROM public.skills s WHERE s.id = v_skill_id;

  SELECT COUNT(DISTINCT us.id) INTO passed_count
  FROM public.universal_submissions us
  JOIN public.universal_assessments ua ON ua.id = us.assessment_id
  WHERE us.user_id = v_user_id
    AND ua.skill_id = v_skill_id
    AND us.status = 'Passed';

  IF passed_count >= 5 THEN
    SELECT id INTO v_existing_passport
    FROM public.skill_passports
    WHERE user_id = v_user_id AND skill_id = v_skill_id
    LIMIT 1;

    IF v_existing_passport IS NULL THEN
      v_passport_number := 'SP-BD-' || upper(substring(replace(gen_random_uuid()::text, '-', '') for 10));
      v_public_id := encode(extensions.gen_random_bytes(16), 'hex');

      INSERT INTO public.skill_passports (
        passport_number, user_id, skill_id, current_level, verification_score,
        evidence_strength, integrity_score, verification_count, public_id,
        status, title, is_verified, qr_code_data
      ) VALUES (
        v_passport_number, v_user_id, v_skill_id, 3, NEW.score,
        'Strong', 100, passed_count, v_public_id,
        'pending_approval', COALESCE(v_skill_name, '') || ' Verified Expert', false,
        'https://skillproof.top/passport/' || v_passport_number
      );

      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        v_user_id,
        'Passport Pending Approval',
        'You have completed 5 distinct ' || COALESCE(v_skill_name, 'skill') || ' assessments. Your Skill Passport is pending admin verification.',
        'passport_upgrade',
        '/dashboard/passport'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_passport_after_submission
  AFTER UPDATE OF status ON public.universal_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_passport_after_submission();

-- INSERT handler. Fires when a submission is created with status='Passed'
-- (e.g. via fn_user_submit_skill_verification where the score is high).
CREATE TRIGGER trg_passport_after_submission_insert
  AFTER INSERT ON public.universal_submissions
  FOR EACH ROW
  WHEN (NEW.status = 'Passed')
  EXECUTE FUNCTION public.trg_passport_after_submission();

-- 3. Rewrite fn_upsert_passport_eligibility_for (migration 42). Same fix.
--    Drop the existing overloads first, then re-create with a body that
--    uses extensions.gen_random_bytes().
DO $$
DECLARE
  overloads TEXT;
BEGIN
  SELECT string_agg(
    format('DROP FUNCTION IF EXISTS public.%I(%s);',
           p.proname,
           pg_get_function_identity_arguments(p.oid)),
    E'\n'
  )
  INTO overloads
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'fn_upsert_passport_eligibility_for';

  IF overloads IS NOT NULL THEN
    EXECUTE overloads;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fn_upsert_passport_eligibility_for(
  p_user_id UUID, p_category_id UUID
) RETURNS public.skill_passports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_count INT;
  v_avg NUMERIC;
  v_category TEXT;
  v_passport_no TEXT;
  v_row public.skill_passports;
BEGIN
  SELECT COUNT(*), COALESCE(AVG(s.score), 0)
    INTO v_count, v_avg
    FROM public.skill_verification_submissions s
    JOIN public.skill_verification_tasks t ON t.id = s.task_id
   WHERE s.user_id = p_user_id
     AND t.category_id = p_category_id
     AND s.status = 'Passed';

  SELECT name INTO v_category FROM public.categories WHERE id = p_category_id;

  SELECT * INTO v_row FROM public.skill_passports
    WHERE user_id = p_user_id AND category_id = p_category_id
    LIMIT 1;

  IF v_row.id IS NOT NULL THEN
    UPDATE public.skill_passports
      SET passed_count  = v_count,
          average_marks = v_avg,
          main_category_name = COALESCE(v_category, main_category_name),
          updated_at = NOW()
    WHERE id = v_row.id
    RETURNING * INTO v_row;
    RETURN v_row;
  END IF;

  IF v_count < 5 THEN
    RETURN NULL;
  END IF;

  v_passport_no := 'SP-BD-' || upper(substr(md5(random()::TEXT || clock_timestamp()::TEXT), 1, 10));

  INSERT INTO public.skill_passports (
    passport_number, user_id, skill_id, category_id, main_category_name,
    title, status, is_verified, public_id,
    passed_count, average_marks, level
  ) VALUES (
    v_passport_no, p_user_id, NULL, p_category_id, v_category,
    'Skill Passport — ' || COALESCE(v_category, 'General'),
    'pending_approval', FALSE,
    encode(extensions.gen_random_bytes(12), 'hex'),
    v_count, v_avg, 'Bronze'
  )
  RETURNING * INTO v_row;

  PERFORM public.fn_audit_log(
    'AUTO_CREATE_PASSPORT_FROM_ELIGIBILITY',
    'skill_passport', v_row.id::TEXT,
    jsonb_build_object('category_id', p_category_id, 'passed_count', v_count, 'avg', v_avg)
  );

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_upsert_passport_eligibility_for(UUID, UUID)
  TO authenticated, service_role;

COMMIT;