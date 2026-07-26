-- ============================================================================
-- Migration 32: Skill Verification bulk JSON import
--
-- Adds per-task difficulty / assessment_type / estimated_time columns to
-- skill_verification_tasks, relaxes the max_marks / pass_marks CHECK bounds so
-- the JSON importer can supply values, and exposes a single SECURITY DEFINER
-- RPC that performs an all-or-nothing import of N task rows in one transaction.
--
-- The RPC is the source of truth for validation. The React admin UI mirrors the
-- same rules in a client-side validator so admins see per-row errors before
-- the request leaves the browser.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Schema changes
-- ----------------------------------------------------------------------------

ALTER TABLE public.skill_verification_tasks
  ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'Intermediate'
    CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  ADD COLUMN IF NOT EXISTS assessment_type TEXT NOT NULL DEFAULT 'Coding'
    CHECK (assessment_type IN ('Coding', 'Project', 'Practical', 'Portfolio')),
  ADD COLUMN IF NOT EXISTS estimated_time TEXT;

-- Drop the legacy hardcoded max/pass marks CHECKs and replace them with
-- realistic bounds so the JSON importer can set them per task.
ALTER TABLE public.skill_verification_tasks
  DROP CONSTRAINT IF EXISTS skill_verification_tasks_max_marks_check;
ALTER TABLE public.skill_verification_tasks
  DROP CONSTRAINT IF EXISTS skill_verification_tasks_pass_marks_check;
ALTER TABLE public.skill_verification_tasks
  ADD CONSTRAINT skill_verification_tasks_max_marks_check
    CHECK (max_marks BETWEEN 1 AND 100);
ALTER TABLE public.skill_verification_tasks
  ADD CONSTRAINT skill_verification_tasks_pass_marks_check
    CHECK (pass_marks BETWEEN 1 AND max_marks);

CREATE INDEX IF NOT EXISTS idx_svt_difficulty
  ON public.skill_verification_tasks(difficulty);
CREATE INDEX IF NOT EXISTS idx_svt_assessment_type
  ON public.skill_verification_tasks(assessment_type);

-- ----------------------------------------------------------------------------
-- 2. Bulk import RPC
-- ----------------------------------------------------------------------------
-- Validates and inserts N skill_verification_tasks rows in a single
-- transaction. Per-row validation failures are captured into a results array
-- inside the loop; if ANY row fails, the entire transaction is rolled back by
-- raising IMPORT_FAILED at the end. The UI can inspect the per-row error list
-- by re-running the request after corrections.
-- ----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.fn_admin_import_skill_verification_json(JSONB);
CREATE OR REPLACE FUNCTION public.fn_admin_import_skill_verification_json(
  p_payload JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_task       JSONB;
  v_results    JSONB := '[]'::jsonb;
  v_row        INT  := 0;
  v_inserted   INT  := 0;
  v_failed     INT  := 0;
  v_row_status TEXT;
  v_row_error  TEXT;
  v_row_id     UUID;
  v_actor      UUID;

  v_skill_name  TEXT;
  v_cat_id      UUID;
  v_sub_id      UUID;
  v_title       TEXT;
  v_description TEXT;
  v_submission  TEXT;
  v_difficulty  TEXT;
  v_assessment  TEXT;
  v_status      TEXT;
  v_max         SMALLINT;
  v_pass        SMALLINT;
  v_estimated   TEXT;
  v_skill_id    UUID;
  v_resolved_cat UUID;
  v_resolved_sub UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: admin role required' USING ERRCODE = '42501';
  END IF;

  IF p_payload IS NULL
     OR NOT (p_payload ? 'tasks')
     OR jsonb_typeof(p_payload->'tasks') <> 'array' THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD: expected JSON {"tasks": [ ... ]}';
  END IF;

  IF jsonb_array_length(p_payload->'tasks') = 0 THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD: tasks array is empty';
  END IF;

  FOR v_task IN SELECT * FROM jsonb_array_elements(p_payload->'tasks')
  LOOP
    v_row        := v_row + 1;
    v_row_status := 'created';
    v_row_error  := NULL;
    v_row_id     := NULL;
    v_skill_id   := NULL;
    v_resolved_cat := NULL;
    v_resolved_sub := NULL;

    BEGIN
      v_skill_name  := lower(btrim(COALESCE(v_task->>'skill_name', '')));
      v_cat_id      := NULLIF(v_task->>'category_id', '')::UUID;
      v_sub_id      := NULLIF(v_task->>'sub_category_id', '')::UUID;
      v_title       := btrim(COALESCE(v_task->>'title', ''));
      v_description := btrim(COALESCE(v_task->>'description', ''));
      v_submission  := btrim(COALESCE(v_task->>'submission_instructions', ''));
      v_difficulty  := COALESCE(NULLIF(btrim(v_task->>'difficulty'), ''), 'Intermediate');
      v_assessment  := COALESCE(NULLIF(btrim(v_task->>'assessment_type'), ''), 'Coding');
      v_status      := COALESCE(NULLIF(btrim(v_task->>'status'), ''), 'Draft');
      v_max         := COALESCE((v_task->>'max_marks')::SMALLINT, 10);
      v_pass        := COALESCE((v_task->>'pass_marks')::SMALLINT, 6);
      v_estimated   := NULLIF(btrim(v_task->>'estimated_time'), '');

      IF v_skill_name = '' THEN
        RAISE EXCEPTION 'skill_name is required';
      END IF;
      IF v_title = '' OR length(v_title) < 3 OR length(v_title) > 200 THEN
        RAISE EXCEPTION 'title must be 3..200 characters';
      END IF;
      IF length(v_description) < 10 OR length(v_description) > 8000 THEN
        RAISE EXCEPTION 'description must be 10..8000 characters';
      END IF;
      IF length(v_submission) < 10 OR length(v_submission) > 4000 THEN
        RAISE EXCEPTION 'submission_instructions must be 10..4000 characters';
      END IF;
      IF v_difficulty NOT IN ('Beginner', 'Intermediate', 'Advanced') THEN
        RAISE EXCEPTION 'difficulty must be Beginner, Intermediate, or Advanced';
      END IF;
      IF v_assessment NOT IN ('Coding', 'Project', 'Practical', 'Portfolio') THEN
        RAISE EXCEPTION 'assessment_type must be Coding, Project, Practical, or Portfolio';
      END IF;
      IF v_status NOT IN ('Draft', 'Published') THEN
        RAISE EXCEPTION 'status must be Draft or Published';
      END IF;
      IF v_max < 1 OR v_max > 100 THEN
        RAISE EXCEPTION 'max_marks must be between 1 and 100';
      END IF;
      IF v_pass < 1 OR v_pass > v_max THEN
        RAISE EXCEPTION 'pass_marks must be between 1 and max_marks';
      END IF;

      -- Resolve skill by lower(name) within the chosen scope.
      -- If a sub_category_id is supplied, prefer the skill that matches it.
      SELECT s.id, s.category_id, s.sub_category_id
        INTO v_skill_id, v_resolved_cat, v_resolved_sub
        FROM public.skills s
       WHERE lower(s.name) = v_skill_name
         AND s.status <> 'Archived'
         AND (
              (v_cat_id IS NOT NULL AND s.category_id = v_cat_id)
              OR (v_sub_id IS NOT NULL AND s.sub_category_id = v_sub_id)
              OR (v_cat_id IS NULL AND v_sub_id IS NULL)
             )
       ORDER BY (v_sub_id IS NOT NULL AND s.sub_category_id = v_sub_id) DESC,
                (v_cat_id IS NOT NULL AND s.category_id = v_cat_id) DESC
       LIMIT 1;

      IF v_skill_id IS NULL THEN
        RAISE EXCEPTION 'Skill "%" not found in the selected category/sub-category', v_skill_name;
      END IF;

      -- Reject duplicate titles for the same skill (case-insensitive). The
      -- check sees rows already inserted earlier in this same transaction
      -- because Postgres reads its own writes.
      IF EXISTS (
        SELECT 1 FROM public.skill_verification_tasks
        WHERE skill_id = v_skill_id
          AND lower(btrim(title)) = lower(v_title)
      ) THEN
        RAISE EXCEPTION 'Duplicate task title "%" for this skill', v_title;
      END IF;

      -- If the admin didn't supply a category_id, fall back to the skill's own.
      IF v_cat_id IS NULL THEN
        v_cat_id := v_resolved_cat;
      END IF;
      IF v_sub_id IS NULL THEN
        v_sub_id := v_resolved_sub;
      END IF;

      -- Resolve the actor (created_by / updated_by) once per call.
      IF v_actor IS NULL THEN
        SELECT id INTO v_actor FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
      END IF;

      INSERT INTO public.skill_verification_tasks (
        category_id, sub_category_id, skill_id, title, description, submission_instructions,
        difficulty, assessment_type, estimated_time, max_marks, pass_marks, status,
        created_by, updated_by
      ) VALUES (
        v_cat_id, v_sub_id, v_skill_id, v_title, v_description, v_submission,
        v_difficulty, v_assessment, v_estimated, v_max, v_pass, v_status,
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
          'skill_name', v_skill_name,
          'title', v_title,
          'difficulty', v_difficulty,
          'assessment_type', v_assessment,
          'status', v_status
        )
      );

      v_inserted := v_inserted + 1;

    EXCEPTION WHEN OTHERS THEN
      v_row_status := 'invalid';
      v_row_error  := SQLERRM;
      v_failed     := v_failed + 1;
    END;

    v_results := v_results || jsonb_build_object(
      'row',       v_row,
      'status',    v_row_status,
      'task_id',   v_row_id,
      'error',     v_row_error,
      'title',     v_task->>'title',
      'skill_name', v_task->>'skill_name'
    );
  END LOOP;

  -- All-or-nothing: raise so the whole transaction rolls back.
  IF v_failed > 0 THEN
    RAISE EXCEPTION 'IMPORT_FAILED: % of % tasks failed. First error: %',
      v_failed, v_row, (SELECT el->>'error'
                        FROM jsonb_array_elements(v_results) el
                        WHERE el->>'status' = 'invalid'
                        LIMIT 1)
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'ok',       true,
    'inserted', v_inserted,
    'failed',   v_failed,
    'total',    v_row,
    'results',  v_results
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.fn_admin_import_skill_verification_json(JSONB)
  TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. Realtime publication (no-op if already added)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.skill_verification_tasks';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
