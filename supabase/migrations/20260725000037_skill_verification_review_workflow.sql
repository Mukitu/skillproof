-- Migration 37 — Skill Verification Review Workflow (production hardening).
--
-- This migration:
--   1. Expands skill_verification_submissions.status from
--      ('Pending Review', 'Passed', 'Failed') to
--      ('Submitted', 'Under Review', 'Passed', 'Failed') and migrates the
--      existing 'Pending Review' rows to 'Submitted'. This expresses the
--      full Submitted → Under Review → Passed/Failed lifecycle requested
--      by the product team.
--   2. Rewrites every Skill Verification RPC that joins more than one
--      table so every column reference is fully qualified with its table
--      alias. This guarantees that PostgreSQL can never raise
--      "column reference "id" is ambiguous" again — every SELECT uses
--      <alias>.<column> with no bare column references.
--   3. Adds a new RPC fn_admin_mark_submission_under_review that lets an
--      admin transition a submission from Submitted → Under Review
--      without committing to a score yet.
--
-- Aliases used throughout the rewrite (chosen so they never collide with
-- any future join):
--   s — skill_verification_submissions
--   t — skill_verification_tasks
--   c — categories
--   sc — sub_categories
--   r — profiles (reviewer)
--   u — profiles (submitter / owner)
--
-- Idempotent: every CREATE uses DROP FUNCTION IF EXISTS first; every
-- ALTER uses DROP CONSTRAINT IF EXISTS first; the data migration is
-- guarded by a NOT EXISTS check.

BEGIN;

-- ============================================================================
-- 1. Expand the status CHECK constraint and migrate existing rows.
-- ============================================================================

ALTER TABLE public.skill_verification_submissions
  DROP CONSTRAINT IF EXISTS skill_verification_submissions_status_check;

-- Migrate any existing 'Pending Review' rows to 'Submitted' BEFORE the
-- new constraint is installed, so existing data still validates. This
-- statement is naturally idempotent: once a row is 'Submitted' it no
-- longer matches the WHERE clause.
UPDATE public.skill_verification_submissions
  SET status = 'Submitted'
  WHERE status = 'Pending Review';

ALTER TABLE public.skill_verification_submissions
  ADD CONSTRAINT skill_verification_submissions_status_check
  CHECK (status IN ('Submitted', 'Under Review', 'Passed', 'Failed'));

-- ============================================================================
-- 2. fn_admin_create_skill_verification_task — unchanged body (no joins).
--    Re-declared with CREATE OR REPLACE so the GRANT is refreshed.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_admin_create_skill_verification_task(
  UUID, UUID, TEXT, TEXT, TEXT
);
CREATE OR REPLACE FUNCTION public.fn_admin_create_skill_verification_task(
  p_category_id           UUID,
  p_sub_category_id       UUID,
  p_title                 TEXT,
  p_description           TEXT,
  p_submission_instructions TEXT
) RETURNS public.skill_verification_tasks
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor UUID;
  v_row   public.skill_verification_tasks;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required.' USING ERRCODE = '42501';
  END IF;
  IF p_category_id IS NULL THEN
    RAISE EXCEPTION 'Main category is required.' USING ERRCODE = '23514';
  END IF;
  IF p_title IS NULL OR btrim(p_title) = '' OR length(btrim(p_title)) < 3 THEN
    RAISE EXCEPTION 'Title must be at least 3 characters.' USING ERRCODE = '23514';
  END IF;
  IF p_description IS NULL OR btrim(p_description) = '' OR length(btrim(p_description)) < 10 THEN
    RAISE EXCEPTION 'Description must be at least 10 characters.' USING ERRCODE = '23514';
  END IF;
  IF p_submission_instructions IS NULL OR btrim(p_submission_instructions) = ''
     OR length(btrim(p_submission_instructions)) < 10 THEN
    RAISE EXCEPTION 'Submission instructions must be at least 10 characters.' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE id = p_category_id) THEN
    RAISE EXCEPTION 'Category not found.' USING ERRCODE = '23503';
  END IF;
  IF p_sub_category_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.sub_categories
                     WHERE id = p_sub_category_id AND category_id = p_category_id) THEN
    RAISE EXCEPTION 'Sub-category does not belong to the selected category.' USING ERRCODE = '23514';
  END IF;

  SELECT u.id INTO v_actor FROM public.profiles u WHERE u.user_id = auth.uid() LIMIT 1;

  INSERT INTO public.skill_verification_tasks (
    category_id, sub_category_id, title, description,
    submission_instructions, difficulty, assessment_type,
    estimated_time, max_marks, pass_marks, status,
    created_by, updated_by
  ) VALUES (
    p_category_id,
    NULLIF(p_sub_category_id, '00000000-0000-0000-0000-000000000000'::UUID),
    btrim(p_title), btrim(p_description),
    btrim(p_submission_instructions),
    'Intermediate', 'Coding', NULL,
    10, 6, 'Draft',
    v_actor, v_actor
  )
  RETURNING * INTO v_row;

  PERFORM public.fn_audit_log(
    'CREATE_SKILL_VERIFICATION_TASK',
    'skill_verification_task', v_row.id::TEXT,
    jsonb_build_object('title', v_row.title, 'category_id', v_row.category_id)
  );

  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_create_skill_verification_task(
  UUID, UUID, TEXT, TEXT, TEXT
) TO authenticated, service_role;

-- ============================================================================
-- 3. fn_admin_update_skill_verification_task — unchanged body.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_admin_update_skill_verification_task(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT
);
CREATE OR REPLACE FUNCTION public.fn_admin_update_skill_verification_task(
  p_id                    UUID,
  p_category_id           UUID,
  p_sub_category_id       UUID,
  p_title                 TEXT,
  p_description           TEXT,
  p_submission_instructions TEXT,
  p_status                TEXT
) RETURNS public.skill_verification_tasks
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor UUID;
  v_row   public.skill_verification_tasks;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required.' USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'Task id is required.' USING ERRCODE = '23514';
  END IF;

  SELECT t.* INTO v_row FROM public.skill_verification_tasks t WHERE t.id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification task not found.' USING ERRCODE = 'P0002';
  END IF;

  IF p_category_id IS NULL THEN
    RAISE EXCEPTION 'Main category is required.' USING ERRCODE = '23514';
  END IF;
  IF p_status NOT IN ('Draft', 'Published', 'Archived') THEN
    RAISE EXCEPTION 'Invalid status "%".', p_status USING ERRCODE = '23514';
  END IF;
  IF p_title IS NULL OR length(btrim(p_title)) < 3 THEN
    RAISE EXCEPTION 'Title must be at least 3 characters.' USING ERRCODE = '23514';
  END IF;
  IF p_description IS NULL OR length(btrim(p_description)) < 10 THEN
    RAISE EXCEPTION 'Description must be at least 10 characters.' USING ERRCODE = '23514';
  END IF;
  IF p_submission_instructions IS NULL OR length(btrim(p_submission_instructions)) < 10 THEN
    RAISE EXCEPTION 'Submission instructions must be at least 10 characters.' USING ERRCODE = '23514';
  END IF;
  IF p_sub_category_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.sub_categories sc
                     WHERE sc.id = p_sub_category_id AND sc.category_id = p_category_id) THEN
    RAISE EXCEPTION 'Sub-category does not belong to the selected category.' USING ERRCODE = '23514';
  END IF;

  SELECT u.id INTO v_actor FROM public.profiles u WHERE u.user_id = auth.uid() LIMIT 1;

  UPDATE public.skill_verification_tasks t SET
    t.category_id            = p_category_id,
    t.sub_category_id        = NULLIF(p_sub_category_id, '00000000-0000-0000-0000-000000000000'::UUID),
    t.title                  = btrim(p_title),
    t.description            = btrim(p_description),
    t.submission_instructions = btrim(p_submission_instructions),
    t.status                 = p_status,
    t.updated_by             = v_actor,
    t.updated_at             = NOW()
  WHERE t.id = p_id
  RETURNING t.* INTO v_row;

  PERFORM public.fn_audit_log(
    'UPDATE_SKILL_VERIFICATION_TASK',
    'skill_verification_task', p_id::TEXT,
    jsonb_build_object('title', v_row.title, 'status', v_row.status)
  );

  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_update_skill_verification_task(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT
) TO authenticated, service_role;

-- ============================================================================
-- 4. fn_admin_publish_skill_verification_task — minor alias sweep, no joins.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_admin_publish_skill_verification_task(UUID, BOOLEAN);
CREATE OR REPLACE FUNCTION public.fn_admin_publish_skill_verification_task(
  p_id UUID, p_publish BOOLEAN
) RETURNS public.skill_verification_tasks
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor UUID;
  v_row   public.skill_verification_tasks;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required.' USING ERRCODE = '42501';
  END IF;
  SELECT u.id INTO v_actor FROM public.profiles u WHERE u.user_id = auth.uid() LIMIT 1;

  UPDATE public.skill_verification_tasks t SET
    t.status     = CASE WHEN p_publish THEN 'Published' ELSE 'Draft' END,
    t.updated_by = v_actor,
    t.updated_at = NOW()
  WHERE t.id = p_id
  RETURNING t.* INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification task not found.' USING ERRCODE = 'P0002';
  END IF;

  PERFORM public.fn_audit_log(
    'PUBLISH_SKILL_VERIFICATION_TASK',
    'skill_verification_task', p_id::TEXT,
    jsonb_build_object('status', v_row.status)
  );

  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_publish_skill_verification_task(UUID, BOOLEAN)
  TO authenticated, service_role;

-- ============================================================================
-- 5. fn_admin_delete_skill_verification_task — alias sweep, no joins.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_admin_delete_skill_verification_task(UUID, BOOLEAN);
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

  -- Count dependents.
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

  -- Cascade: delete dependent submissions first.
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
-- 6. fn_admin_skill_verification_task_stats — alias sweep, one join.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_admin_skill_verification_task_stats(UUID);
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
-- 7. fn_admin_review_skill_verification_submission — adds reviewer name join.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_admin_review_skill_verification_submission(UUID, SMALLINT, TEXT);
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
GRANT EXECUTE ON FUNCTION public.fn_admin_review_skill_verification_submission(UUID, SMALLINT, TEXT)
  TO authenticated, service_role;

-- ============================================================================
-- 8. fn_admin_mark_submission_under_review — NEW RPC.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_admin_mark_submission_under_review(UUID);
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
    -- Re-fetch to surface a precise reason.
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
-- 9. fn_admin_import_skill_verification_json — no joins, kept correct.
--    (No bare columns — body uses jsonb operators.)
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_admin_import_skill_verification_json(JSONB, UUID, UUID);
CREATE OR REPLACE FUNCTION public.fn_admin_import_skill_verification_json(
  p_payload JSONB,
  p_category_id UUID,
  p_sub_category_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_task JSONB;
  v_results JSONB := '[]'::jsonb;
  v_row INT := 0;
  v_inserted INT := 0;
  v_failed INT := 0;
  v_row_status TEXT;
  v_row_error TEXT;
  v_row_id UUID;
  v_actor UUID;

  v_title TEXT;
  v_description TEXT;
  v_submission TEXT;
  v_difficulty TEXT;
  v_assessment_type TEXT;
  v_status TEXT;
  v_max SMALLINT;
  v_pass SMALLINT;
  v_estimated_time TEXT;

  v_tasks JSONB;
  v_seen_titles TEXT[] := '{}';
  v_row_errors JSONB := '[]'::jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: admin role required' USING ERRCODE = '42501';
  END IF;
  IF p_category_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD: category_id is required (select a category in the import modal).' USING ERRCODE = '22000';
  END IF;

  IF p_payload IS NULL
     OR NOT (p_payload ? 'tasks')
     OR jsonb_typeof(p_payload->'tasks') <> 'array' THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD: expected JSON {"tasks": [ ... ]}' USING ERRCODE = '22000';
  END IF;

  v_tasks := p_payload->'tasks';
  IF jsonb_array_length(v_tasks) = 0 THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD: tasks array is empty' USING ERRCODE = '22000';
  END IF;

  SELECT u.id INTO v_actor FROM public.profiles u WHERE u.user_id = auth.uid() LIMIT 1;

  v_row := 0;
  FOR v_task IN SELECT * FROM jsonb_array_elements(v_tasks)
  LOOP
    v_row := v_row + 1;
    v_row_status := 'valid';
    v_row_error := NULL;

    v_title := btrim(COALESCE(v_task->>'title', ''));
    v_description := btrim(COALESCE(v_task->>'description', ''));
    v_submission := btrim(COALESCE(v_task->>'submission_instructions', ''));
    v_difficulty := COALESCE(NULLIF(btrim(v_task->>'difficulty'), ''), 'Intermediate');
    v_assessment_type := COALESCE(NULLIF(btrim(v_task->>'assessment_type'), ''), 'Coding');
    v_status := COALESCE(NULLIF(btrim(v_task->>'status'), ''), 'Draft');
    v_max := COALESCE((v_task->>'max_marks')::SMALLINT, 10);
    v_pass := COALESCE((v_task->>'pass_marks')::SMALLINT, 6);
    v_estimated_time := NULLIF(btrim(v_task->>'estimated_time'), '');

    IF v_title = '' OR length(v_title) < 3 OR length(v_title) > 200 THEN
      v_row_status := 'invalid';
      v_row_error := 'title must be 3..200 characters';
    ELSIF length(v_description) < 10 OR length(v_description) > 8000 THEN
      v_row_status := 'invalid';
      v_row_error := 'description must be 10..8000 characters';
    ELSIF length(v_submission) < 10 OR length(v_submission) > 4000 THEN
      v_row_status := 'invalid';
      v_row_error := 'submission_instructions must be 10..4000 characters';
    ELSIF v_difficulty NOT IN ('Beginner', 'Intermediate', 'Advanced') THEN
      v_row_status := 'invalid';
      v_row_error := 'difficulty must be Beginner, Intermediate, or Advanced';
    ELSIF v_assessment_type NOT IN ('Coding', 'Project', 'Practical', 'Portfolio') THEN
      v_row_status := 'invalid';
      v_row_error := 'assessment_type must be Coding, Project, Practical, or Portfolio';
    ELSIF v_status NOT IN ('Draft', 'Published') THEN
      v_row_status := 'invalid';
      v_row_error := 'status must be Draft or Published';
    ELSIF v_max < 1 OR v_max > 100 THEN
      v_row_status := 'invalid';
      v_row_error := 'max_marks must be between 1 and 100';
    ELSIF v_pass < 1 OR v_pass > v_max THEN
      v_row_status := 'invalid';
      v_row_error := 'pass_marks must be between 1 and max_marks';
    END IF;

    IF v_row_status = 'valid' THEN
      IF v_title = ANY(v_seen_titles) THEN
        v_row_status := 'invalid';
        v_row_error := format('Duplicate task title "%s" in this payload', v_title);
      ELSE
        v_seen_titles := array_append(v_seen_titles, v_title);
      END IF;
    END IF;

    IF v_row_status = 'invalid' THEN
      v_failed := v_failed + 1;
      v_row_errors := v_row_errors || jsonb_build_object(
        'row', v_row, 'title', v_title, 'error', v_row_error
      );
    END IF;

    v_results := v_results || jsonb_build_object(
      'row', v_row, 'status', v_row_status, 'task_id', NULL,
      'error', v_row_error, 'title', v_title
    );
  END LOOP;

  IF v_failed > 0 THEN
    RAISE EXCEPTION 'IMPORT_FAILED: % of % tasks failed. First error: %',
      v_failed, v_row, (SELECT el->>'error' FROM jsonb_array_elements(v_row_errors) el LIMIT 1)
      USING ERRCODE = 'P0001';
  END IF;

  v_row := 0;
  FOR v_task IN SELECT * FROM jsonb_array_elements(v_tasks)
  LOOP
    v_row := v_row + 1;
    v_title := btrim(v_task->>'title');
    v_description := btrim(v_task->>'description');
    v_submission := btrim(v_task->>'submission_instructions');
    v_difficulty := COALESCE(NULLIF(btrim(v_task->>'difficulty'), ''), 'Intermediate');
    v_assessment_type := COALESCE(NULLIF(btrim(v_task->>'assessment_type'), ''), 'Coding');
    v_status := COALESCE(NULLIF(btrim(v_task->>'status'), ''), 'Draft');
    v_max := COALESCE((v_task->>'max_marks')::SMALLINT, 10);
    v_pass := COALESCE((v_task->>'pass_marks')::SMALLINT, 6);
    v_estimated_time := NULLIF(btrim(v_task->>'estimated_time'), '');

    INSERT INTO public.skill_verification_tasks (
      category_id, sub_category_id, title, description, submission_instructions,
      difficulty, assessment_type, estimated_time, max_marks, pass_marks, status,
      created_by, updated_by
    ) VALUES (
      p_category_id, p_sub_category_id, v_title, v_description, v_submission,
      v_difficulty, v_assessment_type, v_estimated_time, v_max, v_pass, v_status,
      v_actor, v_actor
    )
    RETURNING id INTO v_row_id;

    PERFORM public.fn_audit_log(
      'CREATE_SKILL_VERIFICATION_TASK',
      'skill_verification_task',
      v_row_id::TEXT,
      jsonb_build_object(
        'via', 'json_import',
        'row', v_row,
        'title', v_title,
        'difficulty', v_difficulty,
        'assessment_type', v_assessment_type,
        'status', v_status
      )
    );

    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'inserted', v_inserted,
    'failed', v_failed,
    'total', v_row,
    'results', v_results
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_import_skill_verification_json(JSONB, UUID, UUID)
  TO authenticated, service_role;

-- ============================================================================
-- 10. fn_admin_list_skill_verification_submissions — full rewrite with
--     full column aliasing + category/sub_category filtering + reviewer
--     name. Every column reference uses the form <alias>.<column>.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_admin_list_skill_verification_submissions(
  TEXT, TEXT, UUID, UUID
);
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
-- 11. fn_user_submit_skill_verification — status = 'Submitted'.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_user_submit_skill_verification(UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.fn_user_submit_skill_verification(
  p_task_id UUID, p_answer_text TEXT, p_project_url TEXT DEFAULT NULL
) RETURNS public.skill_verification_submissions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile  UUID;
  v_task     public.skill_verification_tasks;
  v_existing public.skill_verification_submissions;
  v_row      public.skill_verification_submissions;
BEGIN
  SELECT u.id INTO v_profile FROM public.profiles u WHERE u.user_id = auth.uid() LIMIT 1;
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'No profile for current user.' USING ERRCODE = '42501';
  END IF;

  IF p_task_id IS NULL THEN
    RAISE EXCEPTION 'Task id is required.' USING ERRCODE = '23514';
  END IF;
  IF p_answer_text IS NULL OR length(btrim(p_answer_text)) < 20 THEN
    RAISE EXCEPTION 'Answer must be at least 20 characters.' USING ERRCODE = '23514';
  END IF;
  IF p_project_url IS NOT NULL AND btrim(p_project_url) <> '' THEN
    IF p_project_url !~ '^https?://' THEN
      RAISE EXCEPTION 'Project URL must start with http:// or https://.' USING ERRCODE = '23514';
    END IF;
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
        s.answer_text = btrim(p_answer_text),
        s.project_url = NULLIF(btrim(p_project_url), ''),
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
        v_profile, p_task_id, btrim(p_answer_text),
        NULLIF(btrim(p_project_url), ''), 'Submitted', NULL, NULL, NULL, NULL
      )
      RETURNING * INTO v_row;
    END IF;
  ELSE
    INSERT INTO public.skill_verification_submissions (
      user_id, task_id, answer_text, project_url, status
    ) VALUES (
      v_profile, p_task_id, btrim(p_answer_text),
      NULLIF(btrim(p_project_url), ''), 'Submitted'
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
-- 12. fn_user_list_my_skill_verification_submissions — full rewrite with
--     every column reference fully aliased (resolves "id is ambiguous")
--     and additional reviewer/category/sub_category fields for the
--     user-facing My Verifications card.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_user_list_my_skill_verification_submissions();
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
-- 13. Realtime publication — already covers both tables; nothing to add.
-- ============================================================================

COMMIT;