-- Migration 42 — Enterprise Skill Passport Core System.
--
-- Adds to the existing skill_passports table:
--   * category_id, main_category_name
--   * level (Bronze/Silver/Gold/Platinum)
--   * passed_count, average_marks, overall_score
--   * issue_date, expiry_date (2-year validity)
--   * renewal_status, skill_tags
--   * digital_signature, signed_at, signed_by
--   * revisions_requested, requested_manually, requested_at
--   * renewed_at, renewed_by
--
-- New tables:
--   * passport_level_history  — audit trail of manual level overrides
--   * passport_renewal_history — permanent renewal trail
--
-- New RPCs (SECURITY DEFINER):
--   * fn_user_request_passport
--   * fn_check_passport_eligibility
--   * fn_upsert_passport_eligibility_for
--   * fn_admin_review_passport
--   * fn_admin_override_passport_level
--   * fn_user_request_passport_renewal
--   * fn_admin_review_passport_renewal
--   * fn_get_passport_overview
--   * fn_list_my_passport_eligibility
--   * fn_expire_passports (sweep)
--   * fn_admin_list_passport_renewals
--
-- Trigger:
--   * trg_passport_eligibility on skill_verification_submissions
--     (after UPDATE OF status) — auto-creates a pending_approval passport
--     when a user reaches 5 Passed in the same main category.
--
-- Realtime:
--   * passport_level_history
--   * passport_renewal_history
--   (skill_passports is already in the publication.)
--
-- Idempotent: every CREATE uses IF NOT EXISTS, every ALTER uses
-- ADD COLUMN IF NOT EXISTS, every CREATE OR REPLACE is preceded by a
-- DROP FUNCTION IF EXISTS walk via pg_catalog.pg_proc.

BEGIN;

-- ============================================================================
-- 1. Extend skill_passports with the enterprise fields.
-- ============================================================================
ALTER TABLE public.skill_passports
  ADD COLUMN IF NOT EXISTS category_id           UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS main_category_name    TEXT,
  ADD COLUMN IF NOT EXISTS level                 TEXT NOT NULL DEFAULT 'Bronze'
                            CHECK (level IN ('Bronze','Silver','Gold','Platinum')),
  ADD COLUMN IF NOT EXISTS passed_count          INTEGER NOT NULL DEFAULT 0 CHECK (passed_count >= 0),
  ADD COLUMN IF NOT EXISTS average_marks         NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (average_marks BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS overall_score         SMALLINT NOT NULL DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS issue_date            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expiry_date           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS renewal_status        TEXT NOT NULL DEFAULT 'not_required'
                            CHECK (renewal_status IN ('not_required','requested','renewed','expired')),
  ADD COLUMN IF NOT EXISTS skill_tags            TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS digital_signature     TEXT,
  ADD COLUMN IF NOT EXISTS signed_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_by             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revisions_requested   TEXT,
  ADD COLUMN IF NOT EXISTS requested_manually    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requested_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS renewed_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS renewed_by            UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_skp_category ON public.skill_passports(category_id);
CREATE INDEX IF NOT EXISTS idx_skp_expiry   ON public.skill_passports(expiry_date);
CREATE INDEX IF NOT EXISTS idx_skp_renewal  ON public.skill_passports(renewal_status);
CREATE INDEX IF NOT EXISTS idx_skp_user_cat ON public.skill_passports(user_id, category_id);

-- ============================================================================
-- 2. passport_level_history — manual level override audit trail.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.passport_level_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id  UUID NOT NULL REFERENCES public.skill_passports(id) ON DELETE CASCADE,
  old_level    TEXT NOT NULL,
  new_level    TEXT NOT NULL CHECK (new_level IN ('Bronze','Silver','Gold','Platinum')),
  reason       TEXT,
  changed_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plh_passport ON public.passport_level_history(passport_id);

ALTER TABLE public.passport_level_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read passport level history" ON public.passport_level_history;
CREATE POLICY "Admins read passport level history"
  ON public.passport_level_history FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Service role inserts passport level history" ON public.passport_level_history;
CREATE POLICY "Service role inserts passport level history"
  ON public.passport_level_history FOR INSERT
  WITH CHECK (public.is_admin());

-- ============================================================================
-- 3. passport_renewal_history — permanent renewal trail.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.passport_renewal_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id   UUID NOT NULL REFERENCES public.skill_passports(id) ON DELETE CASCADE,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at    TIMESTAMPTZ,
  decision      TEXT CHECK (decision IN ('renewed','rejected')),
  admin_notes   TEXT,
  requested_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  old_expiry    TIMESTAMPTZ,
  new_expiry    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_prh_passport ON public.passport_renewal_history(passport_id);
CREATE INDEX IF NOT EXISTS idx_prh_decision ON public.passport_renewal_history(decision);

ALTER TABLE public.passport_renewal_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner and admin read renewal history" ON public.passport_renewal_history;
CREATE POLICY "Owner and admin read renewal history"
  ON public.passport_renewal_history FOR SELECT
  USING (
    passport_id IN (
      SELECT sp.id FROM public.skill_passports sp
      WHERE sp.user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
         OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Service role inserts renewal history" ON public.passport_renewal_history;
CREATE POLICY "Service role inserts renewal history"
  ON public.passport_renewal_history FOR INSERT
  WITH CHECK (public.is_admin());

-- ============================================================================
-- 4. Helper: drop every overload of a function name.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_helper_drop_overloads_42(
  p_schema TEXT, p_name TEXT
) RETURNS VOID
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  v_sig TEXT;
BEGIN
  FOR v_sig IN
    SELECT pg_get_function_identity_arguments(p.oid)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = p_schema
      AND p.proname = p_name
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s)',
                   p_schema, p_name, v_sig);
  END LOOP;
END; $$;

-- ============================================================================
-- 5. fn_check_passport_eligibility — read-only count.
-- ============================================================================
DO $$
BEGIN
  PERFORM public.fn_helper_drop_overloads_42('public', 'fn_check_passport_eligibility');
END; $$;

CREATE OR REPLACE FUNCTION public.fn_check_passport_eligibility(
  p_category_id UUID
) RETURNS TABLE (
  passed_count   INTEGER,
  average_marks  NUMERIC,
  is_eligible    BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile  UUID;
  v_count    INTEGER;
  v_avg      NUMERIC(5,2);
BEGIN
  SELECT id INTO v_profile FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_profile IS NULL THEN
    RETURN QUERY SELECT 0, 0::NUMERIC, FALSE;
    RETURN;
  END IF;

  SELECT COUNT(*)::INTEGER, COALESCE(AVG(s.score), 0)::NUMERIC(5,2)
    INTO v_count, v_avg
    FROM public.skill_verification_submissions s
    JOIN public.skill_verification_tasks t ON t.id = s.task_id
   WHERE s.user_id = v_profile
     AND s.status = 'Passed'
     AND (p_category_id IS NULL OR t.category_id = p_category_id);

  RETURN QUERY SELECT v_count, v_avg, (v_count >= 5);
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_check_passport_eligibility(UUID)
  TO authenticated;

-- ============================================================================
-- 6. fn_upsert_passport_eligibility_for — auto-create pending passport.
-- ============================================================================
DO $$
BEGIN
  PERFORM public.fn_helper_drop_overloads_42('public', 'fn_upsert_passport_eligibility_for');
END; $$;

CREATE OR REPLACE FUNCTION public.fn_upsert_passport_eligibility_for(
  p_user_id     UUID,
  p_category_id UUID
) RETURNS public.skill_passports
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count       INTEGER;
  v_avg         NUMERIC(5,2);
  v_category    TEXT;
  v_existing    public.skill_passports;
  v_row         public.skill_passports;
  v_passport_no TEXT;
BEGIN
  IF p_user_id IS NULL OR p_category_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*)::INTEGER, COALESCE(AVG(s.score), 0)::NUMERIC(5,2)
    INTO v_count, v_avg
    FROM public.skill_verification_submissions s
    JOIN public.skill_verification_tasks t ON t.id = s.task_id
   WHERE s.user_id = p_user_id
     AND s.status = 'Passed'
     AND t.category_id = p_category_id;

  SELECT name INTO v_category FROM public.categories WHERE id = p_category_id;

  SELECT * INTO v_existing FROM public.skill_passports
    WHERE user_id = p_user_id AND category_id = p_category_id
    LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    UPDATE public.skill_passports
      SET passed_count  = v_count,
          average_marks = v_avg,
          main_category_name = COALESCE(v_category, main_category_name),
          updated_at = NOW()
    WHERE id = v_existing.id
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
    encode(gen_random_bytes(12), 'hex'),
    v_count, v_avg, 'Bronze'
  )
  RETURNING * INTO v_row;

  PERFORM public.fn_audit_log(
    'AUTO_CREATE_PASSPORT_FROM_ELIGIBILITY',
    'skill_passport', v_row.id::TEXT,
    jsonb_build_object('category_id', p_category_id, 'passed_count', v_count, 'avg', v_avg)
  );

  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_upsert_passport_eligibility_for(UUID, UUID)
  TO authenticated, service_role;

-- ============================================================================
-- 7. Trigger: auto-eligibility after a submission becomes Passed.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_passport_eligibility_after_review()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_category_id UUID;
BEGIN
  IF NEW.status = 'Passed' AND (OLD.status IS DISTINCT FROM 'Passed') THEN
    SELECT t.category_id INTO v_category_id
      FROM public.skill_verification_tasks t
     WHERE t.id = NEW.task_id;
    IF v_category_id IS NOT NULL THEN
      PERFORM public.fn_upsert_passport_eligibility_for(NEW.user_id, v_category_id);
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_passport_eligibility ON public.skill_verification_submissions;
CREATE TRIGGER trg_passport_eligibility
  AFTER UPDATE OF status ON public.skill_verification_submissions
  FOR EACH ROW EXECUTE FUNCTION public.trg_passport_eligibility_after_review();

-- ============================================================================
-- 8. fn_user_request_passport — manual request, dedup, eligibility check.
-- ============================================================================
DO $$
BEGIN
  PERFORM public.fn_helper_drop_overloads_42('public', 'fn_user_request_passport');
END; $$;

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

  -- Dedup: if (user, category) already has a pending_approval passport, return it.
  SELECT * INTO v_existing FROM public.skill_passports
    WHERE user_id = v_profile
      AND category_id = p_category_id
      AND status IN ('pending_approval', 'active')
    LIMIT 1;
  IF v_existing.id IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- Compute current standing.
  SELECT COUNT(*)::INTEGER, COALESCE(AVG(s.score), 0)::NUMERIC(5,2)
    INTO v_count, v_avg
    FROM public.skill_verification_submissions s
    JOIN public.skill_verification_tasks t ON t.id = s.task_id
   WHERE s.user_id = v_profile
     AND s.status = 'Passed'
     AND t.category_id = p_category_id;

  v_passport_no := 'SP-BD-' || upper(substr(md5(random()::TEXT || clock_timestamp()::TEXT), 1, 10));

  INSERT INTO public.skill_passports (
    passport_number, user_id, skill_id, category_id, main_category_name,
    title, status, is_verified, public_id,
    passed_count, average_marks, level,
    requested_manually, requested_at
  ) VALUES (
    v_passport_no, p_profile, NULL, p_category_id, v_category,
    'Skill Passport — ' || v_category,
    'pending_approval', FALSE,
    encode(gen_random_bytes(12), 'hex'),
    v_count, v_avg, 'Bronze',
    TRUE, NOW()
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
  TO authenticated;

-- ============================================================================
-- 9. fn_admin_review_passport — single atomic decision.
-- ============================================================================
DO $$
BEGIN
  PERFORM public.fn_helper_drop_overloads_42('public', 'fn_admin_review_passport');
END; $$;

CREATE OR REPLACE FUNCTION public.fn_admin_review_passport(
  p_passport_id  UUID,
  p_overall_score SMALLINT,
  p_feedback     TEXT,
  p_decision     TEXT
) RETURNS public.skill_passports
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    v_signature := 'SP-SIG-' || encode(digest(v_row.passport_number || ':' || v_now::TEXT, 'sha256'), 'hex');
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
      WHEN p_decision = 'approve' THEN 'APPROVE_SKILL_PASSPORT'
      WHEN p_decision = 'reject'  THEN 'REJECT_SKILL_PASSPORT'
      ELSE 'REQUEST_REVISIONS_PASSPORT'
    END,
    'skill_passport', p_passport_id::TEXT,
    jsonb_build_object(
      'decision', p_decision,
      'overall_score', p_overall_score,
      'feedback', p_feedback
    )
  );

  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_review_passport(
  UUID, SMALLINT, TEXT, TEXT
) TO authenticated, service_role;

-- ============================================================================
-- 10. fn_admin_override_passport_level — manual level change with audit trail.
-- ============================================================================
DO $$
BEGIN
  PERFORM public.fn_helper_drop_overloads_42('public', 'fn_admin_override_passport_level');
END; $$;

CREATE OR REPLACE FUNCTION public.fn_admin_override_passport_level(
  p_passport_id UUID, p_new_level TEXT, p_reason TEXT
) RETURNS public.skill_passports
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor      UUID;
  v_row        public.skill_passports;
  v_old_level  TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required.' USING ERRCODE = '42501';
  END IF;
  IF p_passport_id IS NULL THEN
    RAISE EXCEPTION 'Passport id is required.' USING ERRCODE = '23514';
  END IF;
  IF p_new_level NOT IN ('Bronze','Silver','Gold','Platinum') THEN
    RAISE EXCEPTION 'Invalid level "%".', p_new_level USING ERRCODE = '23514';
  END IF;

  SELECT id INTO v_actor FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  SELECT * INTO v_row FROM public.skill_passports WHERE id = p_passport_id;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Passport not found.' USING ERRCODE = 'P0002';
  END IF;

  v_old_level := v_row.level;

  UPDATE public.skill_passports
    SET level = p_new_level, updated_at = NOW()
  WHERE id = p_passport_id
  RETURNING * INTO v_row;

  INSERT INTO public.passport_level_history (
    passport_id, old_level, new_level, reason, changed_by
  ) VALUES (
    p_passport_id, v_old_level, p_new_level, p_reason, v_actor
  );

  PERFORM public.fn_audit_log(
    'OVERRIDE_PASSPORT_LEVEL',
    'skill_passport', p_passport_id::TEXT,
    jsonb_build_object('old_level', v_old_level, 'new_level', p_new_level, 'reason', p_reason)
  );

  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_override_passport_level(UUID, TEXT, TEXT)
  TO authenticated, service_role;

-- ============================================================================
-- 11. fn_user_request_passport_renewal — record a renewal request.
-- ============================================================================
DO $$
BEGIN
  PERFORM public.fn_helper_drop_overloads_42('public', 'fn_user_request_passport_renewal');
END; $$;

CREATE OR REPLACE FUNCTION public.fn_user_request_passport_renewal(
  p_passport_id UUID, p_notes TEXT DEFAULT NULL
) RETURNS public.passport_renewal_history
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile  UUID;
  v_passport public.skill_passports;
  v_row      public.passport_renewal_history;
BEGIN
  SELECT id INTO v_profile FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'No profile for current user.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_passport FROM public.skill_passports WHERE id = p_passport_id;
  IF v_passport.id IS NULL THEN
    RAISE EXCEPTION 'Passport not found.' USING ERRCODE = 'P0002';
  END IF;
  IF v_passport.user_id <> v_profile THEN
    RAISE EXCEPTION 'You can only renew your own passport.' USING ERRCODE = '42501';
  END IF;
  IF v_passport.status <> 'active' THEN
    RAISE EXCEPTION 'Only active passports can be renewed.' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.passport_renewal_history (
    passport_id, requested_by, old_expiry, admin_notes
  ) VALUES (
    p_passport_id, v_profile, v_passport.expiry_date, p_notes
  )
  RETURNING * INTO v_row;

  UPDATE public.skill_passports
    SET renewal_status = 'requested', updated_at = NOW()
  WHERE id = p_passport_id;

  PERFORM public.fn_audit_log(
    'REQUEST_PASSPORT_RENEWAL',
    'skill_passport', p_passport_id::TEXT,
    jsonb_build_object('renewal_id', v_row.id, 'notes', p_notes)
  );

  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_user_request_passport_renewal(UUID, TEXT)
  TO authenticated;

-- ============================================================================
-- 12. fn_admin_review_passport_renewal — approve or reject a renewal.
-- ============================================================================
DO $$
BEGIN
  PERFORM public.fn_helper_drop_overloads_42('public', 'fn_admin_review_passport_renewal');
END; $$;

CREATE OR REPLACE FUNCTION public.fn_admin_review_passport_renewal(
  p_renewal_id UUID, p_decision TEXT, p_notes TEXT DEFAULT NULL
) RETURNS public.passport_renewal_history
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor    UUID;
  v_renewal  public.passport_renewal_history;
  v_passport public.skill_passports;
  v_new_expiry TIMESTAMPTZ;
  v_row      public.passport_renewal_history;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required.' USING ERRCODE = '42501';
  END IF;
  IF p_renewal_id IS NULL THEN
    RAISE EXCEPTION 'Renewal id is required.' USING ERRCODE = '23514';
  END IF;
  IF p_decision NOT IN ('renewed','rejected') THEN
    RAISE EXCEPTION 'Invalid decision "%".', p_decision USING ERRCODE = '23514';
  END IF;

  SELECT id INTO v_actor FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  SELECT * INTO v_renewal FROM public.passport_renewal_history WHERE id = p_renewal_id;
  IF v_renewal.id IS NULL THEN
    RAISE EXCEPTION 'Renewal not found.' USING ERRCODE = 'P0002';
  END IF;
  IF v_renewal.decision IS NOT NULL THEN
    RAISE EXCEPTION 'Renewal already decided.' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_passport FROM public.skill_passports WHERE id = v_renewal.passport_id;

  IF p_decision = 'renewed' THEN
    v_new_expiry := NOW() + INTERVAL '2 years';
    UPDATE public.skill_passports
      SET status         = 'active',
          is_verified    = TRUE,
          issue_date     = NOW(),
          expiry_date    = v_new_expiry,
          renewal_status = 'renewed',
          renewed_at     = NOW(),
          renewed_by     = v_actor,
          updated_at     = NOW()
    WHERE id = v_passport.id;
  ELSE
    UPDATE public.skill_passports
      SET renewal_status = 'expired',
          updated_at     = NOW()
    WHERE id = v_passport.id;
  END IF;

  UPDATE public.passport_renewal_history
    SET decision    = p_decision,
        decided_at  = NOW(),
        decided_by  = v_actor,
        admin_notes = COALESCE(p_notes, admin_notes),
        new_expiry  = v_new_expiry
  WHERE id = p_renewal_id
  RETURNING * INTO v_row;

  PERFORM public.fn_audit_log(
    CASE WHEN p_decision = 'renewed' THEN 'RENEW_PASSPORT' ELSE 'REJECT_PASSPORT_RENEWAL' END,
    'skill_passport', v_passport.id::TEXT,
    jsonb_build_object('renewal_id', p_renewal_id, 'decision', p_decision, 'notes', p_notes)
  );

  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_review_passport_renewal(UUID, TEXT, TEXT)
  TO authenticated, service_role;

-- ============================================================================
-- 13. fn_admin_list_passport_renewals — admin renewal queue.
-- ============================================================================
DO $$
BEGIN
  PERFORM public.fn_helper_drop_overloads_42('public', 'fn_admin_list_passport_renewals');
END; $$;

CREATE OR REPLACE FUNCTION public.fn_admin_list_passport_renewals(
  p_pending_only BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  id               UUID,
  passport_id      UUID,
  passport_number  TEXT,
  user_id          UUID,
  user_full_name   TEXT,
  user_email       TEXT,
  requested_at     TIMESTAMPTZ,
  decided_at       TIMESTAMPTZ,
  decision         TEXT,
  admin_notes      TEXT,
  old_expiry       TIMESTAMPTZ,
  new_expiry       TIMESTAMPTZ,
  main_category    TEXT
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    r.id, r.passport_id, p.passport_number, p.user_id,
    pr.full_name, pr.email,
    r.requested_at, r.decided_at, r.decision, r.admin_notes,
    r.old_expiry, r.new_expiry, p.main_category_name
  FROM public.passport_renewal_history r
  JOIN public.skill_passports p ON p.id = r.passport_id
  LEFT JOIN public.profiles pr  ON pr.id = p.user_id
  WHERE (NOT p_pending_only OR r.decision IS NULL)
  ORDER BY r.requested_at DESC;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_list_passport_renewals(BOOLEAN)
  TO authenticated, service_role;

-- ============================================================================
-- 14. fn_list_my_passport_eligibility — category-by-category eligibility.
-- ============================================================================
DO $$
BEGIN
  PERFORM public.fn_helper_drop_overloads_42('public', 'fn_list_my_passport_eligibility');
END; $$;

CREATE OR REPLACE FUNCTION public.fn_list_my_passport_eligibility()
RETURNS TABLE (
  category_id     UUID,
  category_name   TEXT,
  passed_count    INTEGER,
  average_marks   NUMERIC,
  is_eligible     BOOLEAN,
  has_passport    BOOLEAN,
  passport_status TEXT
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  v_profile UUID;
BEGIN
  SELECT id INTO v_profile FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_profile IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH user_passes AS (
    SELECT t.category_id AS cid,
           COUNT(*)::INTEGER AS cnt,
           COALESCE(AVG(s.score), 0)::NUMERIC(5,2) AS avg
      FROM public.skill_verification_submissions s
      JOIN public.skill_verification_tasks t ON t.id = s.task_id
     WHERE s.user_id = v_profile AND s.status = 'Passed'
     GROUP BY t.category_id
  ),
  user_passports AS (
    SELECT sp.category_id AS cid,
           sp.status::TEXT AS st
      FROM public.skill_passports sp
     WHERE sp.user_id = v_profile
  )
  SELECT
    c.id, c.name,
    COALESCE(up.cnt, 0),
    COALESCE(up.avg, 0),
    COALESCE(up.cnt, 0) >= 5,
    (upr.cid IS NOT NULL),
    upr.st
  FROM public.categories c
  LEFT JOIN user_passes up     ON up.cid = c.id
  LEFT JOIN user_passports upr ON upr.cid = c.id
  WHERE COALESCE(up.cnt, 0) > 0 OR upr.cid IS NOT NULL
  ORDER BY COALESCE(up.cnt, 0) DESC, c.name;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_list_my_passport_eligibility()
  TO authenticated;

-- ============================================================================
-- 15. fn_get_passport_overview — single round-trip admin review payload.
-- ============================================================================
DO $$
BEGIN
  PERFORM public.fn_helper_drop_overloads_42('public', 'fn_get_passport_overview');
END; $$;

CREATE OR REPLACE FUNCTION public.fn_get_passport_overview(p_passport_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  v_passport      public.skill_passports;
  v_profile       public.profiles;
  v_result        JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_passport FROM public.skill_passports WHERE id = p_passport_id;
  IF v_passport.id IS NULL THEN
    RAISE EXCEPTION 'Passport not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_passport.user_id;

  SELECT jsonb_build_object(
    'passport', to_jsonb(v_passport),
    'profile',  CASE WHEN v_profile.id IS NULL THEN NULL ELSE to_jsonb(v_profile) END,
    'educations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', e.id, 'degree', e.degree, 'institution', e.institution,
        'year', e.year, 'cgpa', e.cgpa, 'created_at', e.created_at
      ) ORDER BY e.year DESC)
      FROM public.educations e WHERE e.user_id = v_passport.user_id
    ), '[]'::jsonb),
    'experiences', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', x.id, 'role', x.role, 'company', x.company,
        'duration', x.duration, 'summary', x.summary, 'created_at', x.created_at
      ) ORDER BY x.created_at DESC)
      FROM public.experiences x WHERE x.user_id = v_passport.user_id
    ), '[]'::jsonb),
    'user_skills', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', us.id, 'name', us.name, 'category', us.category
      ) ORDER BY us.name)
      FROM public.user_skills us WHERE us.user_id = v_passport.user_id
    ), '[]'::jsonb),
    'level_history', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', l.id, 'old_level', l.old_level, 'new_level', l.new_level,
        'reason', l.reason, 'changed_by', l.changed_by, 'changed_at', l.changed_at
      ) ORDER BY l.changed_at DESC)
      FROM public.passport_level_history l WHERE l.passport_id = v_passport.id
    ), '[]'::jsonb),
    'renewal_history', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id, 'requested_at', r.requested_at, 'decided_at', r.decided_at,
        'decision', r.decision, 'admin_notes', r.admin_notes,
        'requested_by', r.requested_by, 'decided_by', r.decided_by,
        'old_expiry', r.old_expiry, 'new_expiry', r.new_expiry
      ) ORDER BY r.requested_at DESC)
      FROM public.passport_renewal_history r WHERE r.passport_id = v_passport.id
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_get_passport_overview(UUID)
  TO authenticated, service_role;

-- ============================================================================
-- 16. fn_expire_passports — sweep expired passports.
-- ============================================================================
DO $$
BEGIN
  PERFORM public.fn_helper_drop_overloads_42('public', 'fn_expire_passports');
END; $$;

CREATE OR REPLACE FUNCTION public.fn_expire_passports()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE public.skill_passports
      SET renewal_status = 'expired',
          is_verified    = FALSE,
          updated_at     = NOW()
    WHERE status = 'active'
      AND expiry_date IS NOT NULL
      AND expiry_date < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM expired;

  IF v_count > 0 THEN
    PERFORM public.fn_audit_log(
      'EXPIRE_PASSPORTS_SWEEP',
      'skill_passport', NULL,
      jsonb_build_object('expired_count', v_count)
    );
  END IF;

  RETURN v_count;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_expire_passports()
  TO service_role;

-- ============================================================================
-- 17. fn_user_list_my_passport_renewals — for the user renewal card.
-- ============================================================================
DO $$
BEGIN
  PERFORM public.fn_helper_drop_overloads_42('public', 'fn_user_list_my_passport_renewals');
END; $$;

CREATE OR REPLACE FUNCTION public.fn_user_list_my_passport_renewals()
RETURNS TABLE (
  id              UUID,
  passport_id     UUID,
  passport_number TEXT,
  requested_at    TIMESTAMPTZ,
  decided_at      TIMESTAMPTZ,
  decision        TEXT,
  admin_notes     TEXT,
  old_expiry      TIMESTAMPTZ,
  new_expiry      TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  v_profile UUID;
BEGIN
  SELECT id INTO v_profile FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_profile IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT r.id, r.passport_id, p.passport_number,
         r.requested_at, r.decided_at, r.decision, r.admin_notes,
         r.old_expiry, r.new_expiry
    FROM public.passport_renewal_history r
    JOIN public.skill_passports p ON p.id = r.passport_id
   WHERE p.user_id = v_profile
   ORDER BY r.requested_at DESC;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_user_list_my_passport_renewals()
  TO authenticated;

-- ============================================================================
-- 18. Realtime publications.
-- ============================================================================
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.passport_level_history';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.passport_renewal_history';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 19. Drop the one-shot helper.
-- ============================================================================
DROP FUNCTION public.fn_helper_drop_overloads_42(TEXT, TEXT);

COMMIT;