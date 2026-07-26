-- Migration 38 — Relax Skill Verification submission validation.
--
-- Previously, every user submission needed at least 20 characters of
-- answer_text, which forced users to type prose even when their project
-- link alone answered the question. This migration drops the mandatory
-- 20-character requirement and replaces it with "either answer_text or
-- project_url must be non-empty".
--
-- Changes:
--   1. Drop the legacy CHECK constraint that enforced
--      `length(btrim(answer_text)) >= 20`. Replace it with a CHECK that
--      allows empty answer_text as long as project_url is provided.
--   2. Rewrite fn_user_submit_skill_verification so the DB-level guard
--      matches: at least one of answer_text or project_url must contain
--      non-whitespace content.
--
-- Idempotent: every ALTER uses DROP CONSTRAINT IF EXISTS first; every
-- CREATE uses DROP FUNCTION IF EXISTS first.

BEGIN;

-- ============================================================================
-- 1. Replace the answer_text CHECK constraint.
-- ============================================================================

-- Find the actual constraint name (Postgres auto-names it from the column
-- expression, but explicit form is safer).
ALTER TABLE public.skill_verification_submissions
  DROP CONSTRAINT IF EXISTS skill_verification_submissions_answer_text_check;

-- The new rule: both columns may be present, but at least one must have
-- non-whitespace content. NULLs in either column are acceptable on their
-- own — only an all-empty submission is rejected.
ALTER TABLE public.skill_verification_submissions
  ADD CONSTRAINT skill_verification_submissions_answer_text_check
  CHECK (
    (answer_text IS NOT NULL AND btrim(answer_text) <> '')
    OR
    (project_url IS NOT NULL AND btrim(project_url) <> '')
  );

-- ============================================================================
-- 2. Rewrite fn_user_submit_skill_verification.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_user_submit_skill_verification(UUID, TEXT, TEXT);
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

  -- Either answer text or project URL is required (no minimum length).
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

  -- Submission policy:
  --   * 'Submitted' → update in place.
  --   * 'Under Review' → reject (admin is mid-review).
  --   * 'Passed' / 'Failed' → clear and reinsert so the user can retry.
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

COMMIT;