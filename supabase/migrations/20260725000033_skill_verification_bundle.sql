-- Migration 33: Skill Verification bundle JSON import
-- Imports skills and their assessments atomically. Missing skills are created
-- under the selected category/sub-category; existing skills are reused by
-- case-insensitive name.

CREATE OR REPLACE FUNCTION public.fn_admin_import_skill_verification_bundle(
  p_payload JSONB,
  p_category_id UUID,
  p_sub_category_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_skill JSONB;
  v_assessment JSONB;
  v_results JSONB := '[]'::jsonb;
  v_skill_id UUID;
  v_skill_name TEXT;
  v_normalized_name TEXT;
  v_slug TEXT;
  v_title TEXT;
  v_description TEXT;
  v_submission TEXT;
  v_difficulty TEXT;
  v_assessment_type TEXT;
  v_status TEXT;
  v_estimated_time TEXT;
  v_max SMALLINT;
  v_pass SMALLINT;
  v_new_skills INT := 0;
  v_existing_skills INT := 0;
  v_assessments INT := 0;
  v_failed INT := 0;
  v_skill_row INT := 0;
  v_assessment_row INT := 0;
  v_actor UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: admin role required' USING ERRCODE = '42501';
  END IF;
  IF p_category_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD: category_id is required';
  END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object'
     OR jsonb_typeof(p_payload->'skills') <> 'array'
     OR jsonb_array_length(p_payload->'skills') = 0 THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD: expected {"skills":[...]} with at least one skill';
  END IF;

  SELECT id INTO v_actor FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  FOR v_skill IN SELECT value FROM jsonb_array_elements(p_payload->'skills')
  LOOP
    v_skill_row := v_skill_row + 1;
    v_skill_name := btrim(COALESCE(v_skill->>'skill_name', ''));
    v_normalized_name := lower(v_skill_name);
    IF v_skill_name = '' THEN RAISE EXCEPTION 'Skill row %: skill_name is required', v_skill_row; END IF;
    IF length(v_skill_name) > 200 THEN RAISE EXCEPTION 'Skill row %: skill_name is too long', v_skill_row; END IF;
    IF jsonb_typeof(v_skill->'assessments') <> 'array' OR jsonb_array_length(v_skill->'assessments') = 0 THEN
      RAISE EXCEPTION 'Skill row %: assessments must be a non-empty array', v_skill_row;
    END IF;

    SELECT s.id INTO v_skill_id
    FROM public.skills s
    WHERE s.category_id = p_category_id
      AND (p_sub_category_id IS NULL OR s.sub_category_id = p_sub_category_id)
      AND lower(btrim(s.name)) = v_normalized_name
      AND COALESCE(s.status, 'Active') <> 'Archived'
    ORDER BY s.id
    LIMIT 1;

    IF v_skill_id IS NULL THEN
      v_slug := regexp_replace(v_normalized_name, '[^a-z0-9]+', '-', 'g');
      v_slug := trim(both '-' from v_slug);
      IF v_slug = '' THEN v_slug := 'skill'; END IF;
      v_slug := v_slug || '-' || substr(md5(p_category_id::text || ':' || v_normalized_name), 1, 8);
      INSERT INTO public.skills (category_id, sub_category_id, name, slug, status, display_order, difficulty)
      VALUES (p_category_id, p_sub_category_id, v_skill_name, v_slug, 'Active',
              COALESCE((SELECT max(display_order) + 1 FROM public.skills WHERE category_id = p_category_id), 0), 'Medium')
      RETURNING id INTO v_skill_id;
      v_new_skills := v_new_skills + 1;
    ELSE
      v_existing_skills := v_existing_skills + 1;
    END IF;

    FOR v_assessment IN SELECT value FROM jsonb_array_elements(v_skill->'assessments')
    LOOP
      v_assessment_row := v_assessment_row + 1;
      v_title := btrim(COALESCE(v_assessment->>'title', ''));
      v_description := btrim(COALESCE(v_assessment->>'description', ''));
      v_submission := btrim(COALESCE(v_assessment->>'submission_instructions', ''));
      v_difficulty := COALESCE(NULLIF(btrim(v_assessment->>'difficulty'), ''), NULLIF(btrim(v_skill->>'difficulty'), ''), 'Intermediate');
      v_assessment_type := COALESCE(NULLIF(btrim(v_assessment->>'assessment_type'), ''), 'Coding');
      v_status := COALESCE(NULLIF(btrim(v_assessment->>'status'), ''), 'Draft');
      v_estimated_time := NULLIF(btrim(v_assessment->>'estimated_time'), '');
      v_max := COALESCE((v_assessment->>'max_marks')::SMALLINT, 10);
      v_pass := COALESCE((v_assessment->>'pass_marks')::SMALLINT, 6);

      IF length(v_title) < 3 OR length(v_title) > 200 THEN RAISE EXCEPTION 'Assessment %: title must be 3..200 characters', v_assessment_row; END IF;
      IF length(v_description) < 10 OR length(v_description) > 8000 THEN RAISE EXCEPTION 'Assessment %: description must be 10..8000 characters', v_assessment_row; END IF;
      IF length(v_submission) < 10 OR length(v_submission) > 4000 THEN RAISE EXCEPTION 'Assessment %: submission_instructions must be 10..4000 characters', v_assessment_row; END IF;
      IF v_difficulty NOT IN ('Beginner', 'Intermediate', 'Advanced') THEN RAISE EXCEPTION 'Assessment %: invalid difficulty', v_assessment_row; END IF;
      IF v_assessment_type NOT IN ('Coding', 'Project', 'Practical', 'Portfolio') THEN RAISE EXCEPTION 'Assessment %: invalid assessment_type', v_assessment_row; END IF;
      IF v_status NOT IN ('Draft', 'Published') THEN RAISE EXCEPTION 'Assessment %: invalid status', v_assessment_row; END IF;
      IF v_max < 1 OR v_max > 100 OR v_pass < 1 OR v_pass > v_max THEN RAISE EXCEPTION 'Assessment %: invalid marks', v_assessment_row; END IF;
      IF EXISTS (SELECT 1 FROM public.skill_verification_tasks WHERE skill_id = v_skill_id AND lower(btrim(title)) = lower(v_title)) THEN
        RAISE EXCEPTION 'Assessment %: duplicate title for skill "%"', v_assessment_row, v_skill_name;
      END IF;

      INSERT INTO public.skill_verification_tasks (
        category_id, sub_category_id, skill_id, title, description, submission_instructions,
        difficulty, assessment_type, estimated_time, max_marks, pass_marks, status, created_by, updated_by
      ) VALUES (
        p_category_id, p_sub_category_id, v_skill_id, v_title, v_description, v_submission,
        v_difficulty, v_assessment_type, v_estimated_time, v_max, v_pass, v_status, v_actor, v_actor
      );
      v_assessments := v_assessments + 1;
    END LOOP;

    v_results := v_results || jsonb_build_object('row', v_skill_row, 'status', 'created', 'skill_name', v_skill_name, 'assessments', jsonb_array_length(v_skill->'assessments'));
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'new_skills_created', v_new_skills, 'existing_skills_used', v_existing_skills, 'assessments_imported', v_assessments, 'failed_rows', v_failed, 'results', v_results);
EXCEPTION WHEN OTHERS THEN
  -- Rethrowing aborts the RPC transaction, rolling back all skills and tasks.
  RAISE EXCEPTION 'IMPORT_FAILED: %', SQLERRM USING ERRCODE = 'P0001';
END; $$;

GRANT EXECUTE ON FUNCTION public.fn_admin_import_skill_verification_bundle(JSONB, UUID, UUID)
  TO authenticated, service_role;
