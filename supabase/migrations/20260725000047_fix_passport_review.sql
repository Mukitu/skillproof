-- Migration 47 - Fix Skill Passport Review approval workflow.
--
-- Symptoms on /admin/passport-review:
--   1. "function digest(text, unknown) does not exist"   — Approve button
--   2. "new row for relation "skill_passports" violates check constraint
--       "skill_passports_status_check""                  — Reject button
--   3. Request Revisions was already in the allowed set, but splits the
--      same root cause so it's rebuilt here for parity.
--
-- Root cause 1 — digest() call signature:
--   migration 42:460 calls `digest(v_row.passport_number || ':' || v_now::TEXT,
--   'sha256')`. pgcrypto's `digest()` is overloaded as `(bytea, text)` and
--   `(bytea, text[])`. Passing a TEXT first arg with an `unknown` second arg
--   fails to resolve. The fix is to coerce the payload to bytea via the
--   built-in `convert_to(text, 'UTF8')` and to add `extensions` to the
--   function's search_path so `digest` is resolvable in the SECURITY DEFINER
--   context.
--
-- Root cause 2 — CHECK constraint:
--   `skill_passports_status_check` was tightened in migration 3:43 to allow
--   only `('active', 'suspended', 'archived', 'pending_approval')`. The
--   reject branch in `fn_admin_review_passport` (migration 42:487) writes
--   `status = 'rejected'`, which throws the constraint violation. The
--   frontend `PassportStatus` union (database.ts:169) already includes
--   'rejected', so relaxing the DB constraint aligns the schema with the
--   application contract.
--
-- This migration is idempotent. Safe to run on existing data; no row
-- rewrites, only constraint relaxation + function re-creation.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Relax the CHECK constraint to permit 'rejected'.
-- ---------------------------------------------------------------------------
ALTER TABLE public.skill_passports
  DROP CONSTRAINT IF EXISTS skill_passports_status_check;

ALTER TABLE public.skill_passports
  ADD CONSTRAINT skill_passports_status_check
  CHECK (status IN ('active', 'suspended', 'archived', 'pending_approval', 'rejected'));

-- ---------------------------------------------------------------------------
-- 2. Drop every existing overload of public.fn_admin_review_passport so the
--    CREATE OR REPLACE FUNCTION below can re-create the canonical signature
--    (UUID, SMALLINT, TEXT, TEXT) → skill_passports.
-- ---------------------------------------------------------------------------
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
  WHERE n.nspname = 'public' AND p.proname = 'fn_admin_review_passport';

  IF overloads IS NOT NULL THEN
    EXECUTE overloads;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Re-create fn_admin_review_passport with the digest() fix and the
--    extensions schema on the search_path. All three branches (approve,
--    reject, request_revisions) are preserved.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_admin_review_passport(
  p_passport_id   UUID,
  p_overall_score SMALLINT,
  p_feedback      TEXT,
  p_decision      TEXT
) RETURNS public.skill_passports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor     UUID;
  v_row       public.skill_passports;
  v_passed    INTEGER;
  v_avg       NUMERIC(5,2);
  v_level     TEXT;
  v_signature TEXT;
  v_now       TIMESTAMPTZ := NOW();
  v_expiry    TIMESTAMPTZ;
  v_qr_url    TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required.' USING ERRCODE = '42501';
  END IF;
  IF p_passport_id IS NULL THEN
    RAISE EXCEPTION 'Passport id is required.' USING ERRCODE = '23514';
  END IF;
  IF p_decision NOT IN ('approve', 'reject', 'request_revisions') THEN
    RAISE EXCEPTION 'Invalid decision "%".', p_decision USING ERRCODE = '23514';
  END IF;
  IF p_feedback IS NULL OR btrim(p_feedback) = '' THEN
    RAISE EXCEPTION 'Feedback is required.' USING ERRCODE = '23514';
  END IF;
  IF p_decision = 'approve' AND (p_overall_score IS NULL OR p_overall_score < 0 OR p_overall_score > 100) THEN
    RAISE EXCEPTION 'Overall score must be 0..100.' USING ERRCODE = '23514';
  END IF;

  SELECT id INTO v_actor FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'No admin profile.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.skill_passports WHERE id = p_passport_id;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Passport not found.' USING ERRCODE = 'P0002';
  END IF;

  IF p_decision = 'approve' THEN
    -- Recompute passing stats from this user's submissions in this category.
    SELECT COUNT(*)::INTEGER, COALESCE(AVG(s.score), 0)::NUMERIC(5,2)
      INTO v_passed, v_avg
      FROM public.skill_verification_submissions s
      JOIN public.skill_verification_tasks t ON t.id = s.task_id
     WHERE s.user_id = v_row.user_id
       AND s.status = 'Passed'
       AND (v_row.category_id IS NULL OR t.category_id = v_row.category_id);

    -- Compute the level.
    v_level := CASE
      WHEN v_passed >= 40 AND v_avg >= 9.5 AND p_overall_score >= 95 THEN 'Platinum'
      WHEN v_passed >= 20 AND v_avg >= 8.5 AND p_overall_score >= 85 THEN 'Gold'
      WHEN v_passed >= 10 AND v_avg >= 7.5 AND p_overall_score >= 75 THEN 'Silver'
      WHEN v_passed >= 5  AND v_avg >= 6.0 AND p_overall_score >= 60 THEN 'Bronze'
      ELSE 'Bronze'
    END;

    v_expiry := v_now + INTERVAL '2 years';

    -- *** digest() fix ***
    -- pgcrypto's digest() expects (bytea, text). Coerce the payload to bytea
    -- via convert_to(..., 'UTF8') so the call resolves to the right overload.
    v_signature := 'SP-SIG-' || encode(
      extensions.digest(
        convert_to(v_row.passport_number || ':' || v_now::TEXT, 'UTF8'),
        'sha256'
      ),
      'hex'
    );

    v_qr_url := COALESCE(
      current_setting('app.base_url', TRUE),
      'https://skillproof.app'
    ) || '/passport/' || v_row.public_id;

    UPDATE public.skill_passports
      SET status            = 'active',
          is_verified       = TRUE,
          admin_feedback    = btrim(p_feedback),
          overall_score     = p_overall_score,
          level             = v_level,
          passed_count      = v_passed,
          average_marks     = v_avg,
          issue_date        = v_now,
          expiry_date       = v_expiry,
          digital_signature = v_signature,
          signed_at         = v_now,
          signed_by         = v_actor,
          qr_code_data      = v_qr_url,
          renewal_status    = 'not_required',
          revisions_requested = NULL,
          updated_at        = v_now
    WHERE id = p_passport_id
    RETURNING * INTO v_row;

  ELSIF p_decision = 'reject' THEN
    -- CHECK constraint now permits 'rejected' (relaxed above).
    UPDATE public.skill_passports
      SET status            = 'rejected',
          is_verified       = FALSE,
          admin_feedback    = btrim(p_feedback),
          reject_reason     = btrim(p_feedback),
          overall_score     = COALESCE(p_overall_score, 0),
          revisions_requested = NULL,
          updated_at        = v_now
    WHERE id = p_passport_id
    RETURNING * INTO v_row;

  ELSE  -- request_revisions
    UPDATE public.skill_passports
      SET status            = 'pending_approval',
          admin_feedback    = btrim(p_feedback),
          revisions_requested = btrim(p_feedback),
          overall_score     = COALESCE(p_overall_score, overall_score),
          updated_at        = v_now
    WHERE id = p_passport_id
    RETURNING * INTO v_row;
  END IF;

  PERFORM public.fn_audit_log(
    CASE
      WHEN p_decision = 'approve'           THEN 'APPROVE_SKILL_PASSPORT'
      WHEN p_decision = 'reject'            THEN 'REJECT_SKILL_PASSPORT'
      ELSE                                       'REQUEST_REVISIONS_PASSPORT'
    END,
    'skill_passport', p_passport_id::TEXT,
    jsonb_build_object(
      'decision',      p_decision,
      'overall_score', p_overall_score,
      'feedback',      p_feedback
    )
  );

  RETURN v_row;
END; $$;

GRANT EXECUTE ON FUNCTION public.fn_admin_review_passport(UUID, SMALLINT, TEXT, TEXT)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Re-affirm realtime publication for skill_passports so the dashboard
--    re-renders on every status change.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.skill_passports;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

COMMIT;
