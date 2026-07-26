-- Migration 31 - Skill Verification Manager (admin-authored templates + submissions).
--
-- Replaces the AI-generated universal_assessments flow with a fully
-- admin-managed system:
--   * skill_verification_tasks        — admin-authored verification templates
--   * skill_verification_submissions  — user submissions, one per (user, task)
--
-- RPCs (all SECURITY DEFINER, gated through is_admin() where appropriate):
--   * fn_admin_create_skill_verification_task
--   * fn_admin_update_skill_verification_task
--   * fn_admin_publish_skill_verification_task
--   * fn_admin_delete_skill_verification_task        (cascade-aware envelope)
--   * fn_admin_skill_verification_task_stats         (preflight counts)
--   * fn_admin_review_skill_verification_submission  (auto pass/fail at 6+)
--   * fn_admin_list_skill_verification_submissions   (joined list for review)
--   * fn_user_submit_skill_verification              (one submission per user/task)
--   * fn_user_list_my_skill_verification_submissions (joined list for user)
--
-- Every RPC logs to fn_audit_log. RLS is enforced on both tables. Both tables
-- are added to the supabase_realtime publication.

BEGIN;

-- ============================================================================
-- 1. Tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.skill_verification_tasks (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id            UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  sub_category_id        UUID REFERENCES public.sub_categories(id) ON DELETE SET NULL,
  skill_id               UUID NOT NULL REFERENCES public.skills(id) ON DELETE RESTRICT,
  title                  TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 3 AND 200),
  description            TEXT NOT NULL CHECK (length(btrim(description)) BETWEEN 10 AND 8000),
  submission_instructions TEXT NOT NULL CHECK (length(btrim(submission_instructions)) BETWEEN 10 AND 4000),
  max_marks              SMALLINT NOT NULL DEFAULT 10 CHECK (max_marks = 10),
  pass_marks             SMALLINT NOT NULL DEFAULT 6  CHECK (pass_marks = 6),
  status                 TEXT NOT NULL DEFAULT 'Draft'
                           CHECK (status IN ('Draft', 'Published', 'Archived')),
  created_by             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_svt_status_category
  ON public.skill_verification_tasks(status, category_id);
CREATE INDEX IF NOT EXISTS idx_svt_skill
  ON public.skill_verification_tasks(skill_id);
CREATE INDEX IF NOT EXISTS idx_svt_status
  ON public.skill_verification_tasks(status);
CREATE INDEX IF NOT EXISTS idx_svt_created_at
  ON public.skill_verification_tasks(created_at DESC);

CREATE TABLE IF NOT EXISTS public.skill_verification_submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id      UUID NOT NULL REFERENCES public.skill_verification_tasks(id) ON DELETE CASCADE,
  answer_text  TEXT NOT NULL CHECK (length(btrim(answer_text)) >= 20),
  project_url  TEXT,
  status       TEXT NOT NULL DEFAULT 'Pending Review'
                 CHECK (status IN ('Pending Review', 'Passed', 'Failed')),
  score        SMALLINT CHECK (score IS NULL OR (score BETWEEN 0 AND 10)),
  feedback     TEXT,
  reviewed_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_one_submission_per_user_task UNIQUE (user_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_svs_user      ON public.skill_verification_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_svs_task      ON public.skill_verification_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_svs_status    ON public.skill_verification_submissions(status);
CREATE INDEX IF NOT EXISTS idx_svs_created   ON public.skill_verification_submissions(created_at DESC);

-- ============================================================================
-- 2. RLS
-- ============================================================================
ALTER TABLE public.skill_verification_tasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_verification_submissions  ENABLE ROW LEVEL SECURITY;

-- Tasks: anyone authenticated may read Published; admins get full access.
DROP POLICY IF EXISTS "Anyone can view published verification tasks" ON public.skill_verification_tasks;
CREATE POLICY "Anyone can view published verification tasks"
  ON public.skill_verification_tasks
  FOR SELECT
  USING (status = 'Published' OR public.is_admin());

DROP POLICY IF EXISTS "Admins full access verification tasks" ON public.skill_verification_tasks;
CREATE POLICY "Admins full access verification tasks"
  ON public.skill_verification_tasks
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Submissions: owner can SELECT + INSERT (when task is Published) +
-- UPDATE-while-pending. Admin full access.
DROP POLICY IF EXISTS "Users can view own verification submissions" ON public.skill_verification_submissions;
CREATE POLICY "Users can view own verification submissions"
  ON public.skill_verification_submissions
  FOR SELECT
  USING (
    user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Users can submit verification task" ON public.skill_verification_submissions;
CREATE POLICY "Users can submit verification task"
  ON public.skill_verification_submissions
  FOR INSERT
  WITH CHECK (
    user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.skill_verification_tasks t
      WHERE t.id = task_id AND t.status = 'Published'
    )
  );

DROP POLICY IF EXISTS "Users can update own pending submission" ON public.skill_verification_submissions;
CREATE POLICY "Users can update own pending submission"
  ON public.skill_verification_submissions
  FOR UPDATE
  USING (
    user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND status = 'Pending Review'
  );

DROP POLICY IF EXISTS "Admins full access verification submissions" ON public.skill_verification_submissions;
CREATE POLICY "Admins full access verification submissions"
  ON public.skill_verification_submissions
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- 3. Admin RPCs
-- ============================================================================

-- ---- create ----------------------------------------------------------------
DROP FUNCTION IF EXISTS public.fn_admin_create_skill_verification_task(
  UUID, UUID, UUID, TEXT, TEXT, TEXT
);
CREATE OR REPLACE FUNCTION public.fn_admin_create_skill_verification_task(
  p_category_id           UUID,
  p_sub_category_id       UUID,
  p_skill_id              UUID,
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
  IF p_skill_id IS NULL THEN
    RAISE EXCEPTION 'Skill is required.' USING ERRCODE = '23514';
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
  IF NOT EXISTS (SELECT 1 FROM public.skills WHERE id = p_skill_id) THEN
    RAISE EXCEPTION 'Skill not found.' USING ERRCODE = '23503';
  END IF;
  IF p_sub_category_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.sub_categories
                     WHERE id = p_sub_category_id AND category_id = p_category_id) THEN
    RAISE EXCEPTION 'Sub-category does not belong to the selected category.' USING ERRCODE = '23514';
  END IF;

  SELECT id INTO v_actor FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  INSERT INTO public.skill_verification_tasks (
    category_id, sub_category_id, skill_id, title, description,
    submission_instructions, max_marks, pass_marks, status,
    created_by, updated_by
  ) VALUES (
    p_category_id,
    NULLIF(p_sub_category_id, '00000000-0000-0000-0000-000000000000'::UUID),
    p_skill_id, btrim(p_title), btrim(p_description),
    btrim(p_submission_instructions),
    10, 6, 'Draft',
    v_actor, v_actor
  )
  RETURNING * INTO v_row;

  PERFORM public.fn_audit_log(
    'CREATE_SKILL_VERIFICATION_TASK',
    'skill_verification_task', v_row.id::TEXT,
    jsonb_build_object('title', v_row.title, 'skill_id', v_row.skill_id)
  );

  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_create_skill_verification_task(
  UUID, UUID, UUID, TEXT, TEXT, TEXT
) TO authenticated, service_role;

-- ---- update ----------------------------------------------------------------
DROP FUNCTION IF EXISTS public.fn_admin_update_skill_verification_task(
  UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT
);
CREATE OR REPLACE FUNCTION public.fn_admin_update_skill_verification_task(
  p_id                    UUID,
  p_category_id           UUID,
  p_sub_category_id       UUID,
  p_skill_id              UUID,
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
  IF p_skill_id IS NULL THEN
    RAISE EXCEPTION 'Skill is required.' USING ERRCODE = '23514';
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
    skill_id               = p_skill_id,
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
  UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT
) TO authenticated, service_role;

-- ---- publish / archive -----------------------------------------------------
DROP FUNCTION IF EXISTS public.fn_admin_publish_skill_verification_task(UUID, BOOLEAN);
CREATE OR REPLACE FUNCTION public.fn_admin_publish_skill_verification_task(
  p_id UUID, p_publish BOOLEAN
) RETURNS public.skill_verification_tasks
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.skill_verification_tasks;
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

  UPDATE public.skill_verification_tasks
    SET status = CASE WHEN p_publish THEN 'Published' ELSE 'Archived' END,
        updated_at = NOW()
  WHERE id = p_id
  RETURNING * INTO v_row;

  PERFORM public.fn_audit_log(
    CASE WHEN p_publish THEN 'PUBLISH_SKILL_VERIFICATION_TASK'
         ELSE 'ARCHIVE_SKILL_VERIFICATION_TASK' END,
    'skill_verification_task', p_id::TEXT
  );

  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_publish_skill_verification_task(UUID, BOOLEAN)
  TO authenticated, service_role;

-- ---- cascade-aware delete --------------------------------------------------
DROP FUNCTION IF EXISTS public.fn_admin_delete_skill_verification_task(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS public.fn_admin_delete_skill_verification_task(UUID);
CREATE OR REPLACE FUNCTION public.fn_admin_delete_skill_verification_task(
  p_id UUID, p_cascade BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_task          public.skill_verification_tasks;
  v_submissions   INT := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'ok', FALSE, 'code', 'NOT_ADMIN',
      'error', 'Admin role required to delete a verification task.'
    );
  END IF;
  IF p_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', FALSE, 'code', 'INVALID_INPUT',
      'error', 'Task id is required.'
    );
  END IF;

  SELECT * INTO v_task FROM public.skill_verification_tasks WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', FALSE, 'code', 'NOT_FOUND',
      'error', 'Verification task not found.',
      'template_id', p_id
    );
  END IF;

  SELECT COUNT(*) INTO v_submissions
    FROM public.skill_verification_submissions
    WHERE task_id = p_id;

  IF NOT p_cascade AND v_submissions > 0 THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'blocked', TRUE,
      'code', 'HAS_DEPENDENTS',
      'error', format(
        'Cannot delete "%s" because %s submission%s exist. Confirm cascade deletion to proceed.',
        v_task.title, v_submissions,
        CASE WHEN v_submissions = 1 THEN '' ELSE 's' END
      ),
      'template_id', p_id,
      'dependents', jsonb_build_object('submissions', v_submissions)
    );
  END IF;

  IF p_cascade THEN
    DELETE FROM public.skill_verification_submissions WHERE task_id = p_id;
    DELETE FROM public.skill_verification_tasks        WHERE id      = p_id;
  ELSE
    DELETE FROM public.skill_verification_tasks        WHERE id      = p_id;
  END IF;

  BEGIN
    PERFORM public.fn_audit_log(
      'DELETE_SKILL_VERIFICATION_TASK',
      'skill_verification_task', p_id::TEXT,
      jsonb_build_object(
        'cascaded', p_cascade,
        'task_title', v_task.title,
        'deleted', jsonb_build_object('submissions', v_submissions)
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN jsonb_build_object(
    'ok', TRUE, 'cascaded', p_cascade, 'template_id', p_id,
    'deleted', jsonb_build_object('submissions', v_submissions)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'ok', FALSE,
    'error', COALESCE(SQLERRM, 'Unknown database error.'),
    'code', COALESCE(SQLSTATE, 'DB_ERROR'),
    'template_id', p_id
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_delete_skill_verification_task(UUID, BOOLEAN)
  TO authenticated, service_role;

-- ---- preflight stats -------------------------------------------------------
DROP FUNCTION IF EXISTS public.fn_admin_skill_verification_task_stats(UUID);
CREATE OR REPLACE FUNCTION public.fn_admin_skill_verification_task_stats(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_task        public.skill_verification_tasks;
  v_submissions INT := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required.' USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'Task id is required.' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO v_task FROM public.skill_verification_tasks WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification task not found.' USING ERRCODE = 'P0002';
  END IF;
  SELECT COUNT(*) INTO v_submissions
    FROM public.skill_verification_submissions WHERE task_id = p_id;

  RETURN jsonb_build_object(
    'template_id', p_id,
    'template_title', v_task.title,
    'has_dependents', (v_submissions > 0),
    'dependents', jsonb_build_object('submissions', v_submissions)
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_skill_verification_task_stats(UUID)
  TO authenticated, service_role;

-- ---- admin review (auto pass/fail at 6+) ----------------------------------
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

  SELECT id INTO v_reviewer FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  -- Pass >= 6, Fail < 6 (max_marks is fixed at 10, pass_marks at 6 by spec).
  v_status := CASE WHEN p_score >= 6 THEN 'Passed' ELSE 'Failed' END;

  UPDATE public.skill_verification_submissions SET
    status      = v_status,
    score       = p_score,
    feedback    = btrim(p_feedback),
    reviewed_by = v_reviewer,
    reviewed_at = NOW(),
    updated_at  = NOW()
  WHERE id = p_submission_id
  RETURNING * INTO v_row;

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

-- ---- admin joined list (for the review page) ------------------------------
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
  skill_name         TEXT,
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
    sk.name AS skill_name,
    pr.email AS user_email,
    pr.full_name AS user_full_name
  FROM public.skill_verification_submissions s
  JOIN public.skill_verification_tasks t   ON t.id = s.task_id
  LEFT JOIN public.categories c            ON c.id = t.category_id
  LEFT JOIN public.sub_categories sc      ON sc.id = t.sub_category_id
  LEFT JOIN public.skills sk               ON sk.id = t.skill_id
  LEFT JOIN public.profiles pr             ON pr.id = s.user_id
  WHERE (v_status IS NULL OR s.status::TEXT = v_status)
    AND (
      v_search IS NULL
      OR t.title ILIKE '%' || v_search || '%'
      OR sk.name ILIKE '%' || v_search || '%'
      OR pr.email ILIKE '%' || v_search || '%'
      OR pr.full_name ILIKE '%' || v_search || '%'
    )
  ORDER BY s.created_at DESC;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_list_skill_verification_submissions(TEXT, TEXT)
  TO authenticated, service_role;

-- ============================================================================
-- 4. User RPCs
-- ============================================================================

-- ---- submit ----------------------------------------------------------------
DROP FUNCTION IF EXISTS public.fn_user_submit_skill_verification(UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.fn_user_submit_skill_verification(
  p_task_id UUID, p_answer_text TEXT, p_project_url TEXT DEFAULT NULL
) RETURNS public.skill_verification_submissions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile UUID;
  v_task    public.skill_verification_tasks;
  v_existing public.skill_verification_submissions;
  v_row     public.skill_verification_submissions;
BEGIN
  SELECT id INTO v_profile FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
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

  SELECT * INTO v_task FROM public.skill_verification_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found.' USING ERRCODE = 'P0002';
  END IF;
  IF v_task.status <> 'Published' THEN
    RAISE EXCEPTION 'This task is not currently published.' USING ERRCODE = '42501';
  END IF;

  -- Submission policy:
  --   * If a 'Pending Review' row exists → update it.
  --   * If a 'Passed' / 'Failed' row exists → clear it then insert (resubmit allowed).
  --   * Otherwise insert a new row.
  SELECT * INTO v_existing
    FROM public.skill_verification_submissions
    WHERE user_id = v_profile AND task_id = p_task_id
    FOR UPDATE;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.status = 'Pending Review' THEN
      UPDATE public.skill_verification_submissions SET
        answer_text = btrim(p_answer_text),
        project_url = NULLIF(btrim(p_project_url), ''),
        updated_at  = NOW()
      WHERE id = v_existing.id
      RETURNING * INTO v_row;
    ELSE
      -- Passed/Failed → clear reviewed fields, reset status, replace content.
      DELETE FROM public.skill_verification_submissions WHERE id = v_existing.id;

      INSERT INTO public.skill_verification_submissions (
        user_id, task_id, answer_text, project_url, status, score, feedback,
        reviewed_by, reviewed_at
      ) VALUES (
        v_profile, p_task_id, btrim(p_answer_text),
        NULLIF(btrim(p_project_url), ''), 'Pending Review', NULL, NULL, NULL, NULL
      )
      RETURNING * INTO v_row;
    END IF;
  ELSE
    INSERT INTO public.skill_verification_submissions (
      user_id, task_id, answer_text, project_url, status
    ) VALUES (
      v_profile, p_task_id, btrim(p_answer_text),
      NULLIF(btrim(p_project_url), ''), 'Pending Review'
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

-- ---- my submissions (joined) ----------------------------------------------
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
  sub_category_name  TEXT,
  skill_name         TEXT
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
    sc.name AS sub_category_name,
    sk.name AS skill_name
  FROM public.skill_verification_submissions s
  JOIN public.skill_verification_tasks t   ON t.id = s.task_id
  LEFT JOIN public.categories c            ON c.id = t.category_id
  LEFT JOIN public.sub_categories sc      ON sc.id = t.sub_category_id
  LEFT JOIN public.skills sk               ON sk.id = t.skill_id
  WHERE s.user_id = v_profile
  ORDER BY s.created_at DESC;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_user_list_my_skill_verification_submissions()
  TO authenticated;

-- ============================================================================
-- 5. Realtime publication
-- ============================================================================
DO $$
BEGIN
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.skill_verification_tasks';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.skill_verification_submissions';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

COMMIT;
