-- Migration 36 — Drop the Skill layer from Skill Verification.
--
-- The Skill Verification architecture becomes:
--   Main Category -> Sub Category -> Assessment (skill_verification_tasks)
--
-- This migration:
--   1. Drops the skill_id column from skill_verification_tasks
--      (and its FK constraint + index). Pre-existing rows keep their
--      category/sub_category and now live directly under them.
--   2. Rewrites every verification RPC that referenced skill_id:
--        * fn_admin_create_skill_verification_task
--        * fn_admin_update_skill_verification_task
--        * fn_admin_import_skill_verification_json (flat importer)
--        * fn_admin_list_skill_verification_submissions (drops skills join)
--        * fn_user_list_my_skill_verification_submissions (drops skills join)
--      The unique RPC fn_admin_publish_skill_verification_task,
--      fn_admin_delete_skill_verification_task,
--      fn_admin_skill_verification_task_stats,
--      fn_admin_review_skill_verification_submission and
--      fn_user_submit_skill_verification are unchanged (no skill_id).
--   3. Removes the legacy bundle RPC fn_admin_import_skill_verification_bundle
--      because it was the only path that auto-created skills on import.
--
-- Out of scope (kept intact): public.skills table, taxonomy pages,
-- coding_challenges.skill_id, project_challenges.skill_id,
-- skill_verifications / skill_passports / skill_passport_history,
-- and Profile.skills (a tag list, unrelated).
--
-- Idempotent: safe to re-run after a partial application.

BEGIN;

-- ============================================================================
-- 1. Schema: drop skill_id from skill_verification_tasks
-- ============================================================================

ALTER TABLE public.skill_verification_tasks
  DROP CONSTRAINT IF EXISTS skill_verification_tasks_skill_id_fkey;
DROP INDEX IF EXISTS public.idx_svt_skill;

ALTER TABLE public.skill_verification_tasks
  DROP COLUMN IF EXISTS skill_id;

-- ============================================================================
-- 2. Rewrite the admin CRUD RPCs that referenced p_skill_id
-- ============================================================================

-- ---- create ----------------------------------------------------------------
DROP FUNCTION IF EXISTS public.fn_admin_create_skill_verification_task(
  UUID, UUID, UUID, TEXT, TEXT, TEXT
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

  -- FK sanity checks (defence in depth — RLS will also gate writes).
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE id = p_category_id) THEN
    RAISE EXCEPTION 'Category not found.' USING ERRCODE = '23503';
  END IF;
  IF p_sub_category_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.sub_categories
                     WHERE id = p_sub_category_id AND category_id = p_category_id) THEN
    RAISE EXCEPTION 'Sub-category does not belong to the selected category.' USING ERRCODE = '23514';
  END IF;

  SELECT id INTO v_actor FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

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

-- ---- update ----------------------------------------------------------------
DROP FUNCTION IF EXISTS public.fn_admin_update_skill_verification_task(
  UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT
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

  SELECT * INTO v_row FROM public.skill_verification_tasks WHERE id = p_id;
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
     AND NOT EXISTS (SELECT 1 FROM public.sub_categories
                     WHERE id = p_sub_category_id AND category_id = p_category_id) THEN
    RAISE EXCEPTION 'Sub-category does not belong to the selected category.' USING ERRCODE = '23514';
  END IF;

  SELECT id INTO v_actor FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  UPDATE public.skill_verification_tasks SET
    category_id            = p_category_id,
    sub_category_id        = NULLIF(p_sub_category_id, '00000000-0000-0000-0000-000000000000'::UUID),
    title                  = btrim(p_title),
    description            = btrim(p_description),
    submission_instructions = btrim(p_submission_instructions),
    status                 = p_status,
    updated_by             = v_actor,
    updated_at             = NOW()
  WHERE id = p_id
  RETURNING * INTO v_row;

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
-- 3. Rewrite the flat JSON importer to drop skill_name
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
  v_pretty TEXT;
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

  -- Resolve the actor once (created_by / updated_by) for this call.
  SELECT id INTO v_actor FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  -- --------------------------------------------------------------------------
  -- Pass 1: validate every task row. The Skill layer is gone, so there are
  -- no skill lookups and no MISSING_SKILLS branch — categories and
  -- sub-categories come from the header parameters.
  -- --------------------------------------------------------------------------
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

  -- --------------------------------------------------------------------------
  -- If ANY task failed, surface the first per-row error and roll back.
  -- --------------------------------------------------------------------------
  IF v_failed > 0 THEN
    RAISE EXCEPTION 'IMPORT_FAILED: % of % tasks failed. First error: %',
      v_failed, v_row, (SELECT el->>'error' FROM jsonb_array_elements(v_row_errors) el LIMIT 1)
      USING ERRCODE = 'P0001';
  END IF;

  -- --------------------------------------------------------------------------
  -- Pass 2: insert all rows. Category/sub-category come from the header.
  -- --------------------------------------------------------------------------
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
-- 4. Drop the legacy bundle importer (the only RPC that auto-created skills)
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_admin_import_skill_verification_bundle(JSONB, UUID, UUID);

-- ============================================================================
-- 5. Rewrite the joined list RPCs to drop the skills join
-- ============================================================================

DROP FUNCTION IF EXISTS public.fn_admin_list_skill_verification_submissions(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.fn_admin_list_skill_verification_submissions(
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id                 UUID,
  user_id            UUID,
  task_id            UUID,
  answer_text        TEXT,
  project_url        TEXT,
  status             TEXT,
  score              SMALLINT,
  feedback           TEXT,
  reviewed_by        UUID,
  reviewed_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ,
  task_title         TEXT,
  task_description   TEXT,
  task_max_marks     SMALLINT,
  task_pass_marks    SMALLINT,
  category_id        UUID,
  category_name      TEXT,
  sub_category_name  TEXT,
  user_email         TEXT,
  user_full_name     TEXT
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
    s.id, s.user_id, s.task_id, s.answer_text, s.project_url, s.status::TEXT, s.score, s.feedback,
    s.reviewed_by, s.reviewed_at, s.created_at, s.updated_at,
    t.title AS task_title,
    t.description AS task_description,
    t.max_marks AS task_max_marks,
    t.pass_marks AS task_pass_marks,
    c.id AS category_id,
    c.name AS category_name,
    sc.name AS sub_category_name,
    pr.email AS user_email,
    pr.full_name AS user_full_name
  FROM public.skill_verification_submissions s
  JOIN public.skill_verification_tasks t   ON t.id = s.task_id
  LEFT JOIN public.categories c            ON c.id = t.category_id
  LEFT JOIN public.sub_categories sc      ON sc.id = t.sub_category_id
  LEFT JOIN public.profiles pr             ON pr.id = s.user_id
  WHERE (v_status IS NULL OR s.status::TEXT = v_status)
    AND (
      v_search IS NULL
      OR t.title ILIKE '%' || v_search || '%'
      OR pr.email ILIKE '%' || v_search || '%'
      OR pr.full_name ILIKE '%' || v_search || '%'
    )
  ORDER BY s.created_at DESC;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_list_skill_verification_submissions(TEXT, TEXT)
  TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.fn_user_list_my_skill_verification_submissions();
CREATE OR REPLACE FUNCTION public.fn_user_list_my_skill_verification_submissions()
RETURNS TABLE (
  id                 UUID,
  user_id            UUID,
  task_id            UUID,
  answer_text        TEXT,
  project_url        TEXT,
  status             TEXT,
  score              SMALLINT,
  feedback           TEXT,
  reviewed_by        UUID,
  reviewed_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ,
  task_title         TEXT,
  category_name      TEXT,
  sub_category_name  TEXT
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  v_profile UUID;
BEGIN
  SELECT id INTO v_profile FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_profile IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    s.id, s.user_id, s.task_id, s.answer_text, s.project_url, s.status::TEXT, s.score, s.feedback,
    s.reviewed_by, s.reviewed_at, s.created_at, s.updated_at,
    t.title AS task_title,
    c.name  AS category_name,
    sc.name AS sub_category_name
  FROM public.skill_verification_submissions s
  JOIN public.skill_verification_tasks t   ON t.id = s.task_id
  LEFT JOIN public.categories c            ON c.id = t.category_id
  LEFT JOIN public.sub_categories sc      ON sc.id = t.sub_category_id
  WHERE s.user_id = v_profile
  ORDER BY s.created_at DESC;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_user_list_my_skill_verification_submissions()
  TO authenticated;

-- ============================================================================
-- 6. Realtime: nothing to do. Both tables stay in the publication.
-- ============================================================================

COMMIT;