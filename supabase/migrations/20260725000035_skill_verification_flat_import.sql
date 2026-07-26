-- Migration 35: Skill Verification flat JSON import (single official schema).
--
-- Replaces fn_admin_import_skill_verification_json with a workflow that:
--   * Accepts a flat { "tasks": [...] } payload (no top-level skills array
--     and no per-task category_id / sub_category_id — UUIDs live only in
--     the RPC header parameters).
--   * Resolves each task's skill_id by case-insensitive name lookup within
--     the selected (p_category_id, p_sub_category_id) scope.
--   * If any skill is missing, returns ONE validation message listing all
--     missing skill names. The whole transaction is rolled back.
--   * If all skills are present, inserts every task with the header
--     category_id / sub_category_id applied atomically and returns the
--     import summary.
--
-- The legacy `fn_admin_import_skill_verification_bundle` RPC (migration 33)
-- is kept for backward compatibility but is no longer called by the
-- application code.

BEGIN;

DROP FUNCTION IF EXISTS public.fn_admin_import_skill_verification_json(JSONB);

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

  v_skill_name TEXT;
  v_skill_normalized TEXT;
  v_title TEXT;
  v_description TEXT;
  v_submission TEXT;
  v_difficulty TEXT;
  v_assessment_type TEXT;
  v_status TEXT;
  v_max SMALLINT;
  v_pass SMALLINT;
  v_estimated_time TEXT;
  v_skill_id UUID;

  v_tasks JSONB;
  v_missing_skills TEXT[] := '{}';
  v_seen_titles JSONB := '{}'::jsonb;
  v_row_errors JSONB := '[]'::jsonb;
  v_titles_for_skill JSONB;
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
  -- Pass 1: validate every task row and collect missing skills + duplicates.
  -- We do NOT raise here so we can return a single combined missing-skills
  -- message at the end.
  -- --------------------------------------------------------------------------
  v_row := 0;
  FOR v_task IN SELECT * FROM jsonb_array_elements(v_tasks)
  LOOP
    v_row := v_row + 1;
    v_row_status := 'valid';
    v_row_error := NULL;
    v_skill_id := NULL;

    v_skill_name := btrim(COALESCE(v_task->>'skill_name', ''));
    v_skill_normalized := lower(v_skill_name);
    v_title := btrim(COALESCE(v_task->>'title', ''));
    v_description := btrim(COALESCE(v_task->>'description', ''));
    v_submission := btrim(COALESCE(v_task->>'submission_instructions', ''));
    v_difficulty := COALESCE(NULLIF(btrim(v_task->>'difficulty'), ''), 'Intermediate');
    v_assessment_type := COALESCE(NULLIF(btrim(v_task->>'assessment_type'), ''), 'Coding');
    v_status := COALESCE(NULLIF(btrim(v_task->>'status'), ''), 'Draft');
    v_max := COALESCE((v_task->>'max_marks')::SMALLINT, 10);
    v_pass := COALESCE((v_task->>'pass_marks')::SMALLINT, 6);
    v_estimated_time := NULLIF(btrim(v_task->>'estimated_time'), '');

    IF v_skill_name = '' THEN
      v_row_status := 'invalid';
      v_row_error := 'skill_name is required';
    ELSIF v_title = '' OR length(v_title) < 3 OR length(v_title) > 200 THEN
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

    -- If the per-row fields are valid, look up the skill by name within the
    -- selected header scope. The category and sub-category come from the
    -- import header only — JSON never carries per-task UUIDs.
    IF v_row_status = 'valid' THEN
      SELECT s.id
        INTO v_skill_id
        FROM public.skills s
       WHERE lower(btrim(s.name)) = v_skill_normalized
         AND COALESCE(s.status, 'Active') <> 'Archived'
         AND s.category_id = p_category_id
         AND (p_sub_category_id IS NULL OR s.sub_category_id = p_sub_category_id)
       ORDER BY (p_sub_category_id IS NOT NULL AND s.sub_category_id = p_sub_category_id) DESC
       LIMIT 1;

      IF v_skill_id IS NULL THEN
        v_row_status := 'invalid';
        v_row_error := format('Skill "%s" not found in the selected category/sub-category', v_skill_name);
        IF NOT (v_skill_normalized = ANY(v_missing_skills)) THEN
          v_missing_skills := array_append(v_missing_skills, v_skill_normalized);
        END IF;
      ELSE
        -- In-payload duplicate title guard (also enforced by the DB unique
        -- index on (template_id, skill_id, lower(title)) when applicable).
        v_titles_for_skill := COALESCE(v_seen_titles -> v_skill_normalized, '[]'::jsonb);
        IF v_titles_for_skill ? lower(v_title) THEN
          v_row_status := 'invalid';
          v_row_error := format('Duplicate task title "%s" for skill "%s" in this payload', v_title, v_skill_name);
        ELSE
          v_seen_titles := jsonb_set(
            v_seen_titles,
            ARRAY[v_skill_normalized],
            v_titles_for_skill || to_jsonb(lower(v_title)),
            true
          );
        END IF;
      END IF;
    END IF;

    IF v_row_status = 'invalid' THEN
      v_failed := v_failed + 1;
      v_row_errors := v_row_errors || jsonb_build_object(
        'row', v_row, 'title', v_title, 'skill_name', v_skill_name, 'error', v_row_error
      );
    END IF;

    v_results := v_results || jsonb_build_object(
      'row', v_row, 'status', v_row_status, 'task_id', NULL,
      'error', v_row_error, 'title', v_title, 'skill_name', v_skill_name
    );
  END LOOP;

  -- --------------------------------------------------------------------------
  -- If ANY task failed (missing skills included), surface a single combined
  -- message and roll back. The client UI shows the verbatim text.
  -- --------------------------------------------------------------------------
  IF v_failed > 0 THEN
    IF array_length(v_missing_skills, 1) > 0 THEN
      -- Always surface a single, combined missing-skills message so the admin
      -- knows exactly which skills to create. Other per-row errors are
      -- deprioritized — the missing skills must be resolved first because
      -- every other row depends on them existing.
      SELECT string_agg(initcap(s), ', ' ORDER BY s) INTO v_pretty
        FROM unnest(v_missing_skills) s;
      RAISE EXCEPTION 'MISSING_SKILLS: % — please create these skills under the selected category/sub-category before importing.', v_pretty
        USING ERRCODE = 'P0001';
    ELSE
      -- No missing skills, just other per-row validation errors. Surface the
      -- first one so the admin can fix the JSON and re-import.
      RAISE EXCEPTION 'IMPORT_FAILED: % of % tasks failed. First error: %',
        v_failed, v_row, (SELECT el->>'error' FROM jsonb_array_elements(v_row_errors) el LIMIT 1)
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Pass 2: insert all rows. They were validated above so no per-row errors
  -- are expected; the unique-constraint CHECK will still protect against
  -- existing DB rows.
  -- --------------------------------------------------------------------------
  v_row := 0;
  FOR v_task IN SELECT * FROM jsonb_array_elements(v_tasks)
  LOOP
    v_row := v_row + 1;
    v_skill_name := btrim(v_task->>'skill_name');
    v_skill_normalized := lower(v_skill_name);
    v_title := btrim(v_task->>'title');
    v_description := btrim(v_task->>'description');
    v_submission := btrim(v_task->>'submission_instructions');
    v_difficulty := COALESCE(NULLIF(btrim(v_task->>'difficulty'), ''), 'Intermediate');
    v_assessment_type := COALESCE(NULLIF(btrim(v_task->>'assessment_type'), ''), 'Coding');
    v_status := COALESCE(NULLIF(btrim(v_task->>'status'), ''), 'Draft');
    v_max := COALESCE((v_task->>'max_marks')::SMALLINT, 10);
    v_pass := COALESCE((v_task->>'pass_marks')::SMALLINT, 6);
    v_estimated_time := NULLIF(btrim(v_task->>'estimated_time'), '');

    SELECT s.id
      INTO v_skill_id
      FROM public.skills s
     WHERE lower(btrim(s.name)) = v_skill_normalized
       AND COALESCE(s.status, 'Active') <> 'Archived'
       AND s.category_id = p_category_id
       AND (p_sub_category_id IS NULL OR s.sub_category_id = p_sub_category_id)
     ORDER BY (p_sub_category_id IS NOT NULL AND s.sub_category_id = p_sub_category_id) DESC
     LIMIT 1;

    INSERT INTO public.skill_verification_tasks (
      category_id, sub_category_id, skill_id, title, description, submission_instructions,
      difficulty, assessment_type, estimated_time, max_marks, pass_marks, status,
      created_by, updated_by
    ) VALUES (
      p_category_id, p_sub_category_id, v_skill_id, v_title, v_description, v_submission,
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
        'skill_name', v_skill_name,
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
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_import_skill_verification_json(JSONB, UUID, UUID)
  TO authenticated, service_role;

COMMIT;
