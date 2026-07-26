-- Migration 34: Roadmap day lesson LMS upgrade.
--
-- Each roadmap_template_days row becomes a self-contained lesson:
--   * description (rich text)            — full lesson description
--   * learning_objectives (text[])       — what the user should learn
--   * instructions (text[])              — step-by-step instructions
--   * practice_tasks (text[])            — hands-on practice
--   * notes (text)                       — admin notes
--   * estimated_minutes (int)            — estimated time
--   * video_title, video_url, video_provider (nullable)
--   * extra_resources (jsonb)            — array of {label, url, description}
--
-- Existing video_links / pdfs / study_materials columns are kept (nullable,
-- default '{}') for back-compat with the legacy `fn_user_get_roadmap_day_details`
-- rows. The user RPC exposes the new shape (instructions, video_*, resources)
-- alongside the existing fields so the lesson page can render the full content.

BEGIN;

-- ============================================================================
-- 1. Schema additions to roadmap_template_days
-- ============================================================================
ALTER TABLE public.roadmap_template_days
  ADD COLUMN IF NOT EXISTS video_title     TEXT,
  ADD COLUMN IF NOT EXISTS video_url       TEXT,
  ADD COLUMN IF NOT EXISTS video_provider  TEXT
    CHECK (video_provider IS NULL OR video_provider IN ('youtube', 'embed')),
  ADD COLUMN IF NOT EXISTS instructions    TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.roadmap_template_days.video_title IS
  'Optional title for the lesson video shown above the embed.';
COMMENT ON COLUMN public.roadmap_template_days.video_url IS
  'YouTube watch URL or direct embed URL for the lesson video.';
COMMENT ON COLUMN public.roadmap_template_days.video_provider IS
  '"youtube" for a YouTube URL that needs ?embed=true conversion, "embed" for a ready-to-use iframe URL.';
COMMENT ON COLUMN public.roadmap_template_days.instructions IS
  'Ordered step-by-step instructions. Empty array means the day has no numbered steps.';
COMMENT ON COLUMN public.roadmap_template_days.extra_resources IS
  'JSON array of external resources: each entry is {label, url, description}.';

-- ============================================================================
-- 2. fn_user_get_roadmap_day_details — keep behaviour identical but expose the
--    new columns. Already admin-locked via RLS so the columns are only seen by
--    authenticated callers passing ownership + 24h unlock checks.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_user_get_roadmap_day_details(UUID, INT);
CREATE OR REPLACE FUNCTION public.fn_user_get_roadmap_day_details(
  p_enrollment_id UUID, p_day_number INT
) RETURNS public.roadmap_template_days
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile_id UUID;
  v_enrollment public.career_roadmap_enrollment;
  v_prev public.career_roadmap_progress;
  v_row public.roadmap_template_days;
BEGIN
  IF p_day_number IS NULL OR p_day_number < 1 THEN
    RAISE EXCEPTION 'Invalid day number.' USING ERRCODE = '23514';
  END IF;

  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = auth.uid();
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No profile for current user.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_enrollment FROM public.career_roadmap_enrollment
    WHERE id = p_enrollment_id AND user_id = v_profile_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No enrollment found.' USING ERRCODE = 'P0002';
  END IF;

  IF p_day_number = 1 THEN
    NULL;
  ELSE
    SELECT * INTO v_prev FROM public.career_roadmap_progress
      WHERE enrollment_id = p_enrollment_id
        AND day_number = p_day_number - 1
        AND is_completed = TRUE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Day % is locked. Complete Day % first.', p_day_number, p_day_number - 1
        USING ERRCODE = '42501';
    END IF;
    IF v_prev.completed_at IS NULL OR v_prev.completed_at > NOW() - INTERVAL '24 hours' THEN
      RAISE EXCEPTION 'Day % is locked. Wait 24 hours after completing Day %.',
        p_day_number, p_day_number - 1 USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT * INTO v_row FROM public.roadmap_template_days
    WHERE template_id = v_enrollment.template_id AND day_number = p_day_number;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No content for Day % on this roadmap.', p_day_number
      USING ERRCODE = 'P0002';
  END IF;
  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.fn_user_get_roadmap_day_details(UUID, INT)
  TO authenticated;

-- ============================================================================
-- 3. fn_admin_upsert_roadmap_day_lesson — single RPC for the new lesson
--    shape. Replaces the previous direct upsert from the admin editor so all
--    fields (video, instructions, resources) are saved atomically. Returns the
--    updated row.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_admin_upsert_roadmap_day_lesson(JSONB);
CREATE OR REPLACE FUNCTION public.fn_admin_upsert_roadmap_day_lesson(
  p_payload JSONB
) RETURNS public.roadmap_template_days
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_template_id UUID;
  v_day_number  INT;
  v_title       TEXT;
  v_description TEXT;
  v_estimated   INT;
  v_objectives  TEXT[];
  v_instructions TEXT[];
  v_practice    TEXT[];
  v_resources   JSONB;
  v_video_title TEXT;
  v_video_url   TEXT;
  v_video_provider TEXT;
  v_notes       TEXT;
  v_row         public.roadmap_template_days;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to edit a roadmap day.' USING ERRCODE = '42501';
  END IF;

  v_template_id := NULLIF(p_payload->>'template_id', '')::UUID;
  v_day_number  := NULLIF(p_payload->>'day_number', '')::INT;
  v_title       := btrim(COALESCE(p_payload->>'title', ''));
  v_description := btrim(COALESCE(p_payload->>'description', ''));
  v_estimated   := COALESCE(NULLIF((p_payload->>'estimated_minutes')::INT, 0), 60);
  v_video_title := NULLIF(btrim(p_payload->>'video_title'), '');
  v_video_url   := NULLIF(btrim(p_payload->>'video_url'), '');
  v_video_provider := NULLIF(btrim(COALESCE(p_payload->>'video_provider', '')), '');
  v_notes       := NULLIF(btrim(p_payload->>'notes'), '');

  IF v_template_id IS NULL THEN RAISE EXCEPTION 'template_id is required.' USING ERRCODE = '23514'; END IF;
  IF v_day_number IS NULL OR v_day_number < 1 THEN RAISE EXCEPTION 'day_number must be a positive integer.' USING ERRCODE = '23514'; END IF;
  IF v_title = '' THEN RAISE EXCEPTION 'Day title is required.' USING ERRCODE = '23514'; END IF;
  IF v_estimated < 5 THEN RAISE EXCEPTION 'estimated_minutes must be >= 5.' USING ERRCODE = '23514'; END IF;
  IF v_video_provider NOT IN (NULL, 'youtube', 'embed') THEN
    RAISE EXCEPTION 'video_provider must be "youtube" or "embed".' USING ERRCODE = '23514';
  END IF;
  IF v_video_provider IS NOT NULL AND v_video_url IS NULL THEN
    RAISE EXCEPTION 'video_url is required when video_provider is set.' USING ERRCODE = '23514';
  END IF;
  IF v_video_url IS NOT NULL AND v_video_provider IS NULL THEN
    RAISE EXCEPTION 'video_provider is required when video_url is set.' USING ERRCODE = '23514';
  END IF;

  v_objectives := ARRAY(
    SELECT btrim(x)
    FROM jsonb_array_elements_text(COALESCE(p_payload->'learning_objectives', '[]'::jsonb)) x
    WHERE btrim(x) <> ''
  );
  v_instructions := ARRAY(
    SELECT btrim(x)
    FROM jsonb_array_elements_text(COALESCE(p_payload->'instructions', '[]'::jsonb)) x
    WHERE btrim(x) <> ''
  );
  v_practice := ARRAY(
    SELECT btrim(x)
    FROM jsonb_array_elements_text(COALESCE(p_payload->'practice_tasks', '[]'::jsonb)) x
    WHERE btrim(x) <> ''
  );

  IF jsonb_typeof(COALESCE(p_payload->'resources', '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'resources must be an array.' USING ERRCODE = '23514';
  END IF;
  v_resources := COALESCE(p_payload->'resources', '[]'::jsonb);

  INSERT INTO public.roadmap_template_days (
    template_id, day_number, title, description, estimated_minutes,
    learning_objectives, instructions, practice_tasks,
    extra_resources, video_title, video_url, video_provider, notes
  ) VALUES (
    v_template_id, v_day_number, v_title, NULLIF(v_description, ''), v_estimated,
    v_objectives, v_instructions, v_practice,
    v_resources, v_video_title, v_video_url, v_video_provider, v_notes
  )
  ON CONFLICT (template_id, day_number) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    estimated_minutes = EXCLUDED.estimated_minutes,
    learning_objectives = EXCLUDED.learning_objectives,
    instructions = EXCLUDED.instructions,
    practice_tasks = EXCLUDED.practice_tasks,
    extra_resources = EXCLUDED.extra_resources,
    video_title = EXCLUDED.video_title,
    video_url = EXCLUDED.video_url,
    video_provider = EXCLUDED.video_provider,
    notes = EXCLUDED.notes,
    updated_at = NOW()
  RETURNING * INTO v_row;

  PERFORM public.fn_audit_log(
    'UPDATE_ROADMAP_DAY', 'roadmap_template_day', v_row.id::TEXT,
    jsonb_build_object(
      'template_id', v_template_id,
      'day_number', v_day_number,
      'has_video', v_video_url IS NOT NULL,
      'instructions_count', array_length(v_instructions, 1),
      'practice_count', array_length(v_practice, 1),
      'resource_count', jsonb_array_length(v_resources)
    )
  );

  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.fn_admin_upsert_roadmap_day_lesson(JSONB)
  TO authenticated, service_role;

-- ============================================================================
-- 4. fn_admin_import_roadmap_json — extended to accept the new lesson shape.
--    Existing fields (video_links, study_materials, etc.) remain supported.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_admin_import_roadmap_json(UUID, JSONB);
CREATE OR REPLACE FUNCTION public.fn_admin_import_roadmap_json(
  p_template_id UUID,
  p_payload JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_elem JSONB;
  v_count INT := 0;
  v_days JSONB;
  v_seen INT[] := '{}';
  v_n INT;
  v_day_number INT;
  v_title TEXT;
  v_description TEXT;
  v_estimated INT;
  v_objectives TEXT[];
  v_instructions TEXT[];
  v_practice TEXT[];
  v_resources JSONB;
  v_video_title TEXT;
  v_video_url TEXT;
  v_video_provider TEXT;
  v_notes TEXT;
  v_legacy_video_links TEXT[];
  v_legacy_materials TEXT[];
  v_day_record public.roadmap_template_days;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to import a roadmap.' USING ERRCODE = '42501';
  END IF;

  IF p_template_id IS NULL THEN
    RAISE EXCEPTION 'Template id is required.' USING ERRCODE = '23514';
  END IF;
  IF jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'JSON payload must be an object with a "days" array.' USING ERRCODE = '22000';
  END IF;

  v_days := p_payload -> 'days';
  IF v_days IS NULL OR jsonb_typeof(v_days) <> 'array' THEN
    RAISE EXCEPTION 'JSON payload must contain a "days" array.' USING ERRCODE = '22000';
  END IF;
  IF jsonb_array_length(v_days) = 0 THEN
    RAISE EXCEPTION 'JSON payload must contain at least one day.' USING ERRCODE = '22000';
  END IF;

  -- Pass 1: validate + collect day numbers.
  FOR v_elem IN SELECT * FROM jsonb_array_elements(v_days)
  LOOP
    v_day_number := NULLIF(v_elem ->> 'day_number', '')::INT;
    v_title := NULLIF(btrim(v_elem ->> 'title'), '');
    v_estimated := COALESCE(NULLIF((v_elem ->> 'estimated_minutes')::INT, 0), 60);

    IF v_day_number IS NULL OR v_day_number < 1 THEN
      RAISE EXCEPTION 'Invalid day_number "%" — must be a positive integer.', v_day_number
        USING ERRCODE = '23514';
    END IF;
    IF v_title IS NULL THEN
      RAISE EXCEPTION 'Day % is missing a title.', v_day_number
        USING ERRCODE = '23514';
    END IF;
    IF v_estimated < 5 THEN
      RAISE EXCEPTION 'Day % has invalid estimated_minutes (must be >= 5).', v_day_number
        USING ERRCODE = '23514';
    END IF;
    v_n := v_day_number;
    IF v_n = ANY(v_seen) THEN
      RAISE EXCEPTION 'Duplicate day_number "%" in payload — JSON import rejected.', v_n
        USING ERRCODE = '23514';
    END IF;
    v_seen := array_append(v_seen, v_n);
  END LOOP;

  -- Reject duplicates already present on the template.
  IF EXISTS (
    SELECT 1 FROM public.roadmap_template_days
    WHERE template_id = p_template_id AND day_number = ANY(v_seen)
  ) THEN
    RAISE EXCEPTION 'One or more day_numbers already exist on this template. JSON import rejected to prevent duplicates.'
      USING ERRCODE = '23514';
  END IF;

  -- Pass 2: insert.
  FOR v_elem IN SELECT * FROM jsonb_array_elements(v_days)
  LOOP
    v_day_number := NULLIF(v_elem ->> 'day_number', '')::INT;
    v_title := btrim(v_elem ->> 'title');
    v_description := NULLIF(btrim(v_elem ->> 'description'), '');
    v_estimated := COALESCE(NULLIF((v_elem ->> 'estimated_minutes')::INT, 0), 60);

    v_objectives := ARRAY(
      SELECT btrim(x) FROM jsonb_array_elements_text(COALESCE(v_elem -> 'learning_objectives', '[]'::jsonb)) x
      WHERE btrim(x) <> ''
    );
    v_instructions := ARRAY(
      SELECT btrim(x) FROM jsonb_array_elements_text(COALESCE(v_elem -> 'instructions', '[]'::jsonb)) x
      WHERE btrim(x) <> ''
    );
    v_practice := ARRAY(
      SELECT btrim(x) FROM jsonb_array_elements_text(COALESCE(v_elem -> 'practice_tasks', '[]'::jsonb)) x
      WHERE btrim(x) <> ''
    );
    IF jsonb_typeof(COALESCE(v_elem -> 'resources', 'null'::jsonb)) = 'array' THEN
      v_resources := v_elem -> 'resources';
    ELSE
      v_resources := COALESCE(v_elem -> 'extra_resources', '[]'::jsonb);
    END IF;
    IF jsonb_typeof(v_resources) <> 'array' THEN
      RAISE EXCEPTION 'Day %: resources must be an array.', v_day_number USING ERRCODE = '23514';
    END IF;

    v_video_title := NULLIF(btrim(v_elem ->> 'video_title'), '');
    v_video_url := NULLIF(btrim(v_elem ->> 'video_url'), '');
    v_video_provider := NULLIF(btrim(COALESCE(v_elem ->> 'video_provider', '')), '');
    IF v_video_provider NOT IN (NULL, 'youtube', 'embed') THEN
      RAISE EXCEPTION 'Day %: video_provider must be "youtube" or "embed".', v_day_number USING ERRCODE = '23514';
    END IF;
    IF v_video_provider IS NULL AND v_video_url IS NOT NULL THEN
      RAISE EXCEPTION 'Day %: video_provider is required when video_url is set.', v_day_number USING ERRCODE = '23514';
    END IF;
    IF v_video_url IS NULL AND v_video_provider IS NOT NULL THEN
      RAISE EXCEPTION 'Day %: video_url is required when video_provider is set.', v_day_number USING ERRCODE = '23514';
    END IF;

    v_notes := NULLIF(btrim(v_elem ->> 'notes'), '');

    -- Preserve legacy arrays when provided; otherwise coerce the first
    -- instruction into the materials list for back-compat.
    v_legacy_video_links := COALESCE(
      ARRAY(SELECT btrim(x) FROM jsonb_array_elements_text(COALESCE(v_elem -> 'video_links', '[]'::jsonb)) x WHERE btrim(x) <> ''),
      ARRAY[]::TEXT[]
    );
    v_legacy_materials := COALESCE(
      ARRAY(SELECT btrim(x) FROM jsonb_array_elements_text(COALESCE(v_elem -> 'study_materials', '[]'::jsonb)) x WHERE btrim(x) <> ''),
      CASE WHEN array_length(v_instructions, 1) IS NOT NULL THEN v_instructions ELSE ARRAY[]::TEXT[] END
    );

    INSERT INTO public.roadmap_template_days (
      template_id, day_number, title, description, estimated_minutes,
      learning_objectives, instructions, practice_tasks,
      extra_resources, video_title, video_url, video_provider, notes,
      -- legacy back-compat columns
      video_links, study_materials, pdfs, mini_project, assignment
    ) VALUES (
      p_template_id, v_day_number, v_title, v_description, v_estimated,
      v_objectives, v_instructions, v_practice,
      v_resources, v_video_title, v_video_url, v_video_provider, v_notes,
      v_legacy_video_links, v_legacy_materials,
      COALESCE(ARRAY(SELECT btrim(x) FROM jsonb_array_elements_text(COALESCE(v_elem -> 'pdfs', '[]'::jsonb)) x), ARRAY[]::TEXT[]),
      NULLIF(btrim(v_elem ->> 'mini_project'), ''),
      NULLIF(btrim(v_elem ->> 'assignment'), '')
    )
    RETURNING * INTO v_day_record;

    v_count := v_count + 1;
  END LOOP;

  PERFORM public.fn_audit_log(
    'IMPORT_ROADMAP_DAYS', 'roadmap_template', p_template_id::TEXT,
    jsonb_build_object('inserted', v_count, 'total_days_in_payload', jsonb_array_length(v_days))
  );

  RETURN jsonb_build_object(
    'template_id', p_template_id,
    'inserted_days', v_count,
    'total_days_in_payload', jsonb_array_length(v_days)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.fn_admin_import_roadmap_json(UUID, JSONB)
  TO authenticated, service_role;

-- ============================================================================
-- 5. Realtime publication (idempotent)
-- ============================================================================
DO $$
BEGIN
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.roadmap_template_days';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

COMMIT;