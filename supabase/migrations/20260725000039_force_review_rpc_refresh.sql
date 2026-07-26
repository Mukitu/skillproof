-- Migration 39 — Force-refresh Skill Verification RPCs that write to
-- skill_verification_submissions.
--
-- Background:
--   Migration 31 deployed the first version of every Skill Verification
--   RPC. Migration 37 rewrote those functions with fully qualified
--   table aliases (`s.status`, `s.score`, etc.) so PostgreSQL can never
--   raise "column reference ... is ambiguous" or "column 's' of relation
--   ... does not exist" again.
--
--   However, the live database is still running the migration 31 body of
--   `fn_admin_review_skill_verification_submission`. When the admin
--   review page calls it, the deployed function executes:
--
--       UPDATE public.skill_verification_submissions SET
--         status = v_status,
--         score = p_score,
--         ...
--
--   PostgreSQL parses the SET clause left-to-right: it sees the alias
--   `s` declared later and tries to resolve it as a column name within
--   the same SET clause, which raises:
--
--       column "s" of relation "skill_verification_submissions" does not exist
--
--   Also, the deployed DB may contain multiple overloads of the same
--   function name (e.g. fn_admin_list_skill_verification_submissions
--   was created with both (TEXT, TEXT) and (TEXT, TEXT, UUID, UUID)
--   signatures). PostgreSQL refuses `DROP FUNCTION` without a signature
--   in that case ("function name ... is not unique"), so this migration
--   uses a DO block to iterate over pg_catalog.pg_proc and drop every
--   overload of each function name before recreating it.
--
-- This migration:
--   1. Uses a DO block to drop every overload of each Skill
--      Verification RPC that touches skill_verification_submissions.
--   2. Re-creates the canonical version of each function with the
--      desired signature.
--
-- Idempotent: safe to run twice. Every CREATE uses OR REPLACE so an
-- existing function with the same signature is replaced in place.

BEGIN;

-- ============================================================================
-- 0. Helper: drop every overload of a function name from the public
--    schema. Wrapped in a DO block so we never hit the "is not unique"
--    error.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_helper_drop_every_overload(
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
-- 1. fn_admin_review_skill_verification_submission
-- ============================================================================
DO $$
BEGIN
  PERFORM public.fn_helper_drop_every_overload(
    'public', 'fn_admin_review_skill_verification_submission');
END; $$;

CREATE OR REPLACE FUNCTION public.fn_admin_review_skill_verification_submission(
  p_submission_id UUID, p_score SMALLINT, p_feedback TEXT
) RETURNS public.skill_verification_submissions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reviewer UUID;
  v_row      public.skill_verification_submissions;
  v_status   TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required.' USING ERRCODE = '42501';
  END IF;
  IF p_submission_id IS NULL THEN
    RAISE EXCEPTION 'Submission id is required.' USING ERRCODE = '23514';
  END IF;
  IF p_score IS NULL OR p_score < 0 OR p_score > 10 THEN
    RAISE EXCEPTION 'Score must be between 0 and 10 (got %).', p_score
      USING ERRCODE = '23514';
  END IF;
  IF p_feedback IS NULL OR btrim(p_feedback) = '' THEN
    RAISE EXCEPTION 'Feedback is required.' USING ERRCODE = '23514';
  END IF;

  SELECT u.id INTO v_reviewer FROM public.profiles u WHERE u.user_id = auth.uid() LIMIT 1;
  IF v_reviewer IS NULL THEN
    RAISE EXCEPTION 'No reviewer profile.' USING ERRCODE = '42501';
  END IF;

  v_status := CASE WHEN p_score >= 6 THEN 'Passed' ELSE 'Failed' END;

  UPDATE public.skill_verification_submissions s SET
    s.status      = v_status,
    s.score       = p_score,
    s.feedback    = btrim(p_feedback),
    s.reviewed_by = v_reviewer,
    s.reviewed_at = NOW(),
    s.updated_at  = NOW()
  WHERE s.id = p_submission_id
  RETURNING s.* INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found.' USING ERRCODE = 'P0002';
  END IF;

  PERFORM public.fn_audit_log(
    'REVIEW_SKILL_VERIFICATION_SUBMISSION',
    'skill_verification_submission', p_submission_id::TEXT,
    jsonb_build_object('status', v_status, 'score', p_score)
  );

  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_review_skill_verification_submission(
  UUID, SMALLINT, TEXT
) TO authenticated, service_role;

-- ============================================================================
-- 2. fn_admin_mark_submission_under_review
-- ============================================================================
DO $$
BEGIN
  PERFORM public.fn_helper_drop_every_overload(
    'public', 'fn_admin_mark_submission_under_review');
END; $$;

CREATE OR REPLACE FUNCTION public.fn_admin_mark_submission_under_review(
  p_submission_id UUID
) RETURNS public.skill_verification_submissions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor UUID;
  v_row   public.skill_verification_submissions;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required.' USING ERRCODE = '42501';
  END IF;
  IF p_submission_id IS NULL THEN
    RAISE EXCEPTION 'Submission id is required.' USING ERRCODE = '23514';
  END IF;

  SELECT u.id INTO v_actor FROM public.profiles u WHERE u.user_id = auth.uid() LIMIT 1;
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'No admin profile.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.skill_verification_submissions s SET
    s.status      = 'Under Review',
    s.updated_at  = NOW()
  WHERE s.id = p_submission_id AND s.status = 'Submitted'
  RETURNING s.* INTO v_row;

  IF NOT FOUND THEN
    SELECT s.* INTO v_row FROM public.skill_verification_submissions s WHERE s.id = p_submission_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Submission not found.' USING ERRCODE = 'P0002';
    END IF;
    RAISE EXCEPTION 'Only Submitted submissions can be moved to Under Review (current: %).', v_row.status
      USING ERRCODE = '23514';
  END IF;

  PERFORM public.fn_audit_log(
    'MARK_SKILL_VERIFICATION_UNDER_REVIEW',
    'skill_verification_submission', p_submission_id::TEXT,
    jsonb_build_object('actor', v_actor)
  );

  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_mark_submission_under_review(UUID)
  TO authenticated, service_role;

-- ============================================================================
-- 3. fn_user_submit_skill_verification — refresh to migration 38 version.
-- ============================================================================
DO $$
BEGIN
  PERFORM public.fn_helper_drop_every_overload(
    'public', 'fn_user_submit_skill_verification');
END; $$;

CREATE OR REPLACE FUNCTION public.fn_user_submit_skill_verification(
  p_task_id UUID, p_answer_text TEXT, p_project_url TEXT DEFAULT NULL
) RETURNS public.skill_verification_submissions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile   UUID;
  v_task      public.skill_verification_tasks;
  v_existing  public.skill_verification_submissions;
  v_row       public.skill_verification_submissions;
  v_answer    TEXT := btrim(COALESCE(p_answer_text, ''));
  v_url       TEXT := btrim(COALESCE(p_project_url, ''));
BEGIN
  SELECT u.id INTO v_profile FROM public.profiles u WHERE u.user_id = auth.uid() LIMIT 1;
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'No profile for current user.' USING ERRCODE = '42501';
  END IF;

  IF p_task_id IS NULL THEN
    RAISE EXCEPTION 'Task id is required.' USING ERRCODE = '23514';
  END IF;

  IF v_answer = '' AND v_url = '' THEN
    RAISE EXCEPTION 'Please provide either a code/text answer or a project URL.'
      USING ERRCODE = '23514';
  END IF;

  IF v_url <> '' AND v_url !~ '^https?://' THEN
    RAISE EXCEPTION 'Project URL must start with http:// or https://.' USING ERRCODE = '23514';
  END IF;

  SELECT t.* INTO v_task FROM public.skill_verification_tasks t WHERE t.id = p_task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found.' USING ERRCODE = 'P0002';
  END IF;
  IF v_task.status <> 'Published' THEN
    RAISE EXCEPTION 'This task is not currently published.' USING ERRCODE = '42501';
  END IF;

  SELECT s.* INTO v_existing
    FROM public.skill_verification_submissions s
    WHERE s.user_id = v_profile AND s.task_id = p_task_id
    FOR UPDATE;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.status = 'Submitted' THEN
      UPDATE public.skill_verification_submissions s SET
        s.answer_text = CASE WHEN v_answer = '' THEN NULL ELSE v_answer END,
        s.project_url = CASE WHEN v_url    = '' THEN NULL ELSE v_url    END,
        s.updated_at  = NOW()
      WHERE s.id = v_existing.id
      RETURNING s.* INTO v_row;
    ELSIF v_existing.status = 'Under Review' THEN
      RAISE EXCEPTION 'This submission is currently under review and cannot be edited.' USING ERRCODE = '42501';
    ELSE
      DELETE FROM public.skill_verification_submissions s WHERE s.id = v_existing.id;

      INSERT INTO public.skill_verification_submissions (
        user_id, task_id, answer_text, project_url, status, score, feedback,
        reviewed_by, reviewed_at
      ) VALUES (
        v_profile, p_task_id,
        CASE WHEN v_answer = '' THEN NULL ELSE v_answer END,
        CASE WHEN v_url    = '' THEN NULL ELSE v_url    END,
        'Submitted', NULL, NULL, NULL, NULL
      )
      RETURNING * INTO v_row;
    END IF;
  ELSE
    INSERT INTO public.skill_verification_submissions (
      user_id, task_id, answer_text, project_url, status
    ) VALUES (
      v_profile, p_task_id,
      CASE WHEN v_answer = '' THEN NULL ELSE v_answer END,
      CASE WHEN v_url    = '' THEN NULL ELSE v_url    END,
      'Submitted'
    )
    RETURNING * INTO v_row;
  END IF;

  PERFORM public.fn_audit_log(
    'SUBMIT_SKILL_VERIFICATION',
    'skill_verification_submission', v_row.id::TEXT,
    jsonb_build_object('task_id', p_task_id, 'has_project_url', (v_row.project_url IS NOT NULL))
  );

  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_user_submit_skill_verification(UUID, TEXT, TEXT)
  TO authenticated;

-- ============================================================================
-- 4. fn_admin_delete_skill_verification_task — refresh.
-- ============================================================================
DO $$
BEGIN
  PERFORM public.fn_helper_drop_every_overload(
    'public', 'fn_admin_delete_skill_verification_task');
END; $$;

CREATE OR REPLACE FUNCTION public.fn_admin_delete_skill_verification_task(
  p_id UUID, p_cascade BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_submissions INT := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required.' USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'Task id is required.' USING ERRCODE = '23514';
  END IF;

  SELECT COUNT(*) INTO v_submissions
    FROM public.skill_verification_submissions s
   WHERE s.task_id = p_id;

  IF v_submissions > 0 AND NOT p_cascade THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'blocked', TRUE,
      'dependents', jsonb_build_object('submissions', v_submissions),
      'template_id', p_id
    );
  END IF;

  IF p_cascade THEN
    DELETE FROM public.skill_verification_submissions s WHERE s.task_id = p_id;
  END IF;

  DELETE FROM public.skill_verification_tasks t WHERE t.id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification task not found.' USING ERRCODE = 'P0002';
  END IF;

  PERFORM public.fn_audit_log(
    'DELETE_SKILL_VERIFICATION_TASK',
    'skill_verification_task', p_id::TEXT,
    jsonb_build_object('cascade', p_cascade, 'submissions', v_submissions)
  );

  RETURN jsonb_build_object(
    'ok', TRUE,
    'cascaded', p_cascade,
    'deleted', jsonb_build_object('submissions', v_submissions),
    'template_id', p_id
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_delete_skill_verification_task(UUID, BOOLEAN)
  TO authenticated, service_role;

-- ============================================================================
-- 5. fn_admin_skill_verification_task_stats — read-only COUNT, refresh.
-- ============================================================================
DO $$
BEGIN
  PERFORM public.fn_helper_drop_every_overload(
    'public', 'fn_admin_skill_verification_task_stats');
END; $$;

CREATE OR REPLACE FUNCTION public.fn_admin_skill_verification_task_stats(
  p_id UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  v_title TEXT;
  v_submissions INT := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required.' USING ERRCODE = '42501';
  END IF;
  SELECT t.title INTO v_title
    FROM public.skill_verification_tasks t WHERE t.id = p_id;
  IF v_title IS NULL THEN
    RAISE EXCEPTION 'Verification task not found.' USING ERRCODE = 'P0002';
  END IF;
  SELECT COUNT(*) INTO v_submissions
    FROM public.skill_verification_submissions s WHERE s.task_id = p_id;

  RETURN jsonb_build_object(
    'template_id', p_id,
    'template_title', v_title,
    'has_dependents', (v_submissions > 0),
    'dependents', jsonb_build_object('submissions', v_submissions)
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_skill_verification_task_stats(UUID)
  TO authenticated, service_role;

-- ============================================================================
-- 6. fn_admin_list_skill_verification_submissions — refresh.
-- ============================================================================
DO $$
BEGIN
  PERFORM public.fn_helper_drop_every_overload(
    'public', 'fn_admin_list_skill_verification_submissions');
END; $$;

CREATE OR REPLACE FUNCTION public.fn_admin_list_skill_verification_submissions(
  p_status        TEXT DEFAULT NULL,
  p_search        TEXT DEFAULT NULL,
  p_category_id   UUID DEFAULT NULL,
  p_sub_category_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id                     UUID,
  user_id                UUID,
  task_id                UUID,
  answer_text            TEXT,
  project_url            TEXT,
  status                 TEXT,
  score                  SMALLINT,
  feedback               TEXT,
  reviewed_by            UUID,
  reviewed_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ,
  updated_at             TIMESTAMPTZ,
  task_title             TEXT,
  task_description       TEXT,
  task_max_marks         SMALLINT,
  task_pass_marks        SMALLINT,
  category_id            UUID,
  category_name          TEXT,
  sub_category_id        UUID,
  sub_category_name      TEXT,
  user_email             TEXT,
  user_full_name         TEXT,
  reviewed_by_full_name  TEXT
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  v_status TEXT;
  v_search TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required.' USING ERRCODE = '42501';
  END IF;

  v_status := NULLIF(btrim(p_status), '');
  v_search := NULLIF(btrim(p_search), '');

  RETURN QUERY
  SELECT
    s.id,
    s.user_id,
    s.task_id,
    s.answer_text,
    s.project_url,
    s.status::TEXT,
    s.score,
    s.feedback,
    s.reviewed_by,
    s.reviewed_at,
    s.created_at,
    s.updated_at,
    t.title       AS task_title,
    t.description AS task_description,
    t.max_marks   AS task_max_marks,
    t.pass_marks  AS task_pass_marks,
    c.id          AS category_id,
    c.name        AS category_name,
    sc.id         AS sub_category_id,
    sc.name       AS sub_category_name,
    u.email       AS user_email,
    u.full_name   AS user_full_name,
    r.full_name   AS reviewed_by_full_name
  FROM public.skill_verification_submissions s
  JOIN public.skill_verification_tasks t   ON t.id = s.task_id
  LEFT JOIN public.categories c            ON c.id = t.category_id
  LEFT JOIN public.sub_categories sc      ON sc.id = t.sub_category_id
  LEFT JOIN public.profiles u              ON u.id = s.user_id
  LEFT JOIN public.profiles r              ON r.id = s.reviewed_by
  WHERE (v_status IS NULL OR s.status::TEXT = v_status)
    AND (p_category_id IS NULL OR t.category_id = p_category_id)
    AND (p_sub_category_id IS NULL OR t.sub_category_id = p_sub_category_id)
    AND (
      v_search IS NULL
      OR t.title       ILIKE '%' || v_search || '%'
      OR u.email       ILIKE '%' || v_search || '%'
      OR u.full_name   ILIKE '%' || v_search || '%'
    )
  ORDER BY s.created_at DESC;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_list_skill_verification_submissions(
  TEXT, TEXT, UUID, UUID
) TO authenticated, service_role;

-- ============================================================================
-- 7. fn_user_list_my_skill_verification_submissions — refresh.
-- ============================================================================
DO $$
BEGIN
  PERFORM public.fn_helper_drop_every_overload(
    'public', 'fn_user_list_my_skill_verification_submissions');
END; $$;

CREATE OR REPLACE FUNCTION public.fn_user_list_my_skill_verification_submissions()
RETURNS TABLE (
  id                     UUID,
  user_id                UUID,
  task_id                UUID,
  answer_text            TEXT,
  project_url            TEXT,
  status                 TEXT,
  score                  SMALLINT,
  feedback               TEXT,
  reviewed_by            UUID,
  reviewed_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ,
  updated_at             TIMESTAMPTZ,
  task_title             TEXT,
  task_description       TEXT,
  task_max_marks         SMALLINT,
  task_pass_marks        SMALLINT,
  category_id            UUID,
  category_name          TEXT,
  sub_category_id        UUID,
  sub_category_name      TEXT,
  reviewed_by_full_name  TEXT
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  v_profile UUID;
BEGIN
  SELECT u.id INTO v_profile FROM public.profiles u WHERE u.user_id = auth.uid() LIMIT 1;
  IF v_profile IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.user_id,
    s.task_id,
    s.answer_text,
    s.project_url,
    s.status::TEXT,
    s.score,
    s.feedback,
    s.reviewed_by,
    s.reviewed_at,
    s.created_at,
    s.updated_at,
    t.title       AS task_title,
    t.description AS task_description,
    t.max_marks   AS task_max_marks,
    t.pass_marks  AS task_pass_marks,
    c.id          AS category_id,
    c.name        AS category_name,
    sc.id         AS sub_category_id,
    sc.name       AS sub_category_name,
    r.full_name   AS reviewed_by_full_name
  FROM public.skill_verification_submissions s
  JOIN public.skill_verification_tasks t   ON t.id = s.task_id
  LEFT JOIN public.categories c            ON c.id = t.category_id
  LEFT JOIN public.sub_categories sc      ON sc.id = t.sub_category_id
  LEFT JOIN public.profiles r              ON r.id = s.reviewed_by
  WHERE s.user_id = v_profile
  ORDER BY s.created_at DESC;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_user_list_my_skill_verification_submissions()
  TO authenticated;

-- ============================================================================
-- 8. Drop the helper (one-shot, only needed during this migration).
-- ============================================================================
DROP FUNCTION public.fn_helper_drop_every_overload(TEXT, TEXT);

COMMIT;