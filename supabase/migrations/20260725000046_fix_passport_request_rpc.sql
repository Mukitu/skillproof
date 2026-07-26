-- Migration 46 - Fix fn_user_request_passport: variable typo + add motivation column.
--
-- Symptoms:
--   1. User clicks "Submit Request" on /dashboard/passport. The button shows
--      "Submitting..." for a moment, then shows the generic toast
--      "Could not submit passport request." No passport row is created.
--   2. The admin's /admin/passport-review page never sees the request because
--      the INSERT never happens.
--
-- Root cause: in fn_user_request_passport (migration 42) the INSERT uses
-- `p_profile` instead of `v_profile`. `p_profile` is not a declared parameter
-- (parameters are `p_category_id` and `p_motivation`) and `v_profile` is the
-- local variable that holds `profiles.id`. Postgres raises
-- "column p_profile does not exist" at parse time, so the function call
-- from the client fails. The frontend falls back to its generic catch.
--
-- Additionally, this migration:
--   * Adds a `motivation` column on skill_passports so the user's motivation
--     text is persisted (currently it is only written into audit metadata).
--   * Grants EXECUTE to service_role too (the dedup case calls this from
--     triggers, which run as the definer).
--   * Stores the motivation on the row.
--
-- Idempotent. Safe to run on existing data.

BEGIN;

-- 1. Persist the user's motivation on the row itself.
ALTER TABLE public.skill_passports
  ADD COLUMN IF NOT EXISTS motivation TEXT;

-- 2. Rewrite fn_user_request_passport with the variable typo fixed and the
--    motivation column populated.
DO $$
BEGIN
  PERFORM public.fn_helper_drop_overloads_42('public', 'fn_user_request_passport');
EXCEPTION WHEN OTHERS THEN
  -- fn_helper_drop_overloads_42 may not exist in older projects; the
  -- function is recreated below, which is enough to drop the old body.
  NULL;
END $$;

CREATE OR REPLACE FUNCTION public.fn_user_request_passport(
  p_category_id UUID, p_motivation TEXT DEFAULT NULL
) RETURNS public.skill_passports
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile  UUID;
  v_category TEXT;
  v_count    INTEGER;
  v_avg      NUMERIC(5,2);
  v_existing public.skill_passports;
  v_row      public.skill_passports;
  v_passport_no TEXT;
BEGIN
  SELECT id INTO v_profile FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'No profile for current user.' USING ERRCODE = '42501';
  END IF;
  IF p_category_id IS NULL THEN
    RAISE EXCEPTION 'A category is required.' USING ERRCODE = '23514';
  END IF;

  SELECT name INTO v_category FROM public.categories WHERE id = p_category_id;
  IF v_category IS NULL THEN
    RAISE EXCEPTION 'Category not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Dedup: if (user, category) already has a pending_approval or active
  -- passport, return it. This prevents duplicate requests and lets the UI
  -- show "you already requested this" without throwing.
  SELECT * INTO v_existing FROM public.skill_passports
    WHERE user_id = v_profile
      AND category_id = p_category_id
      AND status IN ('pending_approval', 'active')
    LIMIT 1;
  IF v_existing.id IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- Compute current standing for the request.
  SELECT COUNT(*)::INTEGER, COALESCE(AVG(s.score), 0)::NUMERIC(5,2)
    INTO v_count, v_avg
    FROM public.skill_verification_submissions s
    JOIN public.skill_verification_tasks t ON t.id = s.task_id
   WHERE s.user_id = v_profile
     AND s.status = 'Passed'
     AND t.category_id = p_category_id;

  v_passport_no := 'SP-BD-' || upper(substr(md5(random()::TEXT || clock_timestamp()::TEXT), 1, 10));

  -- *** The bug fix: v_profile (not p_profile). ***
  INSERT INTO public.skill_passports (
    passport_number, user_id, skill_id, category_id, main_category_name,
    title, status, is_verified, public_id,
    passed_count, average_marks, level,
    requested_manually, requested_at, motivation
  ) VALUES (
    v_passport_no, v_profile, NULL, p_category_id, v_category,
    'Skill Passport — ' || v_category,
    'pending_approval', FALSE,
    encode(extensions.gen_random_bytes(12), 'hex'),
    v_count, v_avg, 'Bronze',
    TRUE, NOW(), p_motivation
  )
  RETURNING * INTO v_row;

  PERFORM public.fn_audit_log(
    'REQUEST_PASSPORT_MANUALLY',
    'skill_passport', v_row.id::TEXT,
    jsonb_build_object(
      'category_id', p_category_id,
      'motivation', p_motivation,
      'passed_count', v_count,
      'average_marks', v_avg
    )
  );

  RETURN v_row;
END; $$;

GRANT EXECUTE ON FUNCTION public.fn_user_request_passport(UUID, TEXT)
  TO authenticated, service_role;

-- 3. Add realtime publication for the new motivation column event. The
--    skill_passports table is already in supabase_realtime, but we re-affirm.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.skill_passports;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

COMMIT;