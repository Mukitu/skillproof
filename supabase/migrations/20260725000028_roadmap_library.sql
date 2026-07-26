-- Migration 28 - Career Roadmap Library (multi-enrollment) + rich day content.
--
-- Goals:
--   1. Allow users to enroll in MULTIPLE roadmaps simultaneously. Each
--      enrollment carries its own progress. No more "one active roadmap per
--      user" constraint.
--   2. Enrich roadmap_template_days with the full set of fields the day
--      details page needs:
--        learning_objectives, study_materials, resources (jsonb),
--        video_links, pdfs, practice_tasks, mini_project, assignment, notes.
--   3. Replace `career_roadmap_assignments` with `career_roadmap_enrollment`
--      (one row per (user, template)).
--   4. Strict sequential unlock per enrollment: Day N unlocks at
--      max(started_at, prior_day.completed_at + 24h). The view surfaces this.
--   5. JSON import accommodates the new fields.
--   6. Realtime publication on every roadmap table.

BEGIN;

-- ============================================================================
-- 1. Roadmap templates — ensure thumbnail_url is present.
-- ============================================================================
ALTER TABLE public.roadmap_templates
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

COMMENT ON COLUMN public.roadmap_templates.thumbnail_url IS
  'Public URL of the thumbnail stored in the roadmap-assets bucket.';

-- ============================================================================
-- 2. Roadmap template days — drop legacy heavy arrays, add rich content.
-- ============================================================================
ALTER TABLE public.roadmap_template_days
  DROP COLUMN IF EXISTS key_concepts,
  DROP COLUMN IF EXISTS tasks,
  DROP COLUMN IF EXISTS resources,
  DROP COLUMN IF EXISTS projects;

ALTER TABLE public.roadmap_template_days
  ADD COLUMN IF NOT EXISTS learning_objectives TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS study_materials    TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS extra_resources    JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS video_links        TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pdfs               TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS practice_tasks     TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS mini_project       TEXT,
  ADD COLUMN IF NOT EXISTS assignment         TEXT,
  ADD COLUMN IF NOT EXISTS notes              TEXT;

-- ============================================================================
-- 3. Replace career_roadmap_assignments with career_roadmap_enrollment.
--    Allows multiple active enrollments per user; one row per (user, template).
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.career_roadmap_enrollment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.roadmap_templates(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sub_category_id UUID REFERENCES public.sub_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  total_days INT NOT NULL CHECK (total_days > 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  current_day INT NOT NULL DEFAULT 1,
  completed_count INT NOT NULL DEFAULT 0,
  completion_pct INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_enrollment_per_user_template UNIQUE (user_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_roadmap_enrollment_user
  ON public.career_roadmap_enrollment(user_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_enrollment_template
  ON public.career_roadmap_enrollment(template_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_enrollment_status
  ON public.career_roadmap_enrollment(status);

-- ============================================================================
-- 4. career_roadmap_progress — evolve the pre-existing table if migration 27
--    already created it. New rows are enrollment-based; legacy columns remain
--    nullable for backwards compatibility.
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'career_roadmap_progress'
      AND column_name = 'enrollment_id'
  ) THEN
    ALTER TABLE public.career_roadmap_progress
      ADD COLUMN enrollment_id UUID REFERENCES public.career_roadmap_enrollment(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'career_roadmap_progress'
      AND column_name = 'template_id'
  ) THEN
    ALTER TABLE public.career_roadmap_progress
      ADD COLUMN template_id UUID REFERENCES public.roadmap_templates(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'career_roadmap_progress'
      AND column_name = 'day_number'
  ) THEN
    ALTER TABLE public.career_roadmap_progress
      ADD COLUMN day_number INT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'career_roadmap_progress'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.career_roadmap_progress
      ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

ALTER TABLE public.career_roadmap_progress
  ALTER COLUMN module_id DROP NOT NULL,
  ALTER COLUMN roadmap_id DROP NOT NULL;

-- Backfill the new day_number/template_id fields where legacy module links
-- make that possible. New enrollments are populated by the enrollment RPC.
UPDATE public.career_roadmap_progress p
SET day_number = m.day_number
FROM public.career_roadmap_modules m
WHERE p.module_id = m.id AND p.day_number IS NULL;

CREATE INDEX IF NOT EXISTS idx_roadmap_progress_enrollment
  ON public.career_roadmap_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_progress_user
  ON public.career_roadmap_progress(user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_enrollment_day_progress'
  ) THEN
    ALTER TABLE public.career_roadmap_progress
      ADD CONSTRAINT unique_enrollment_day_progress UNIQUE (enrollment_id, day_number);
  END IF;
END $$;

-- ============================================================================
-- 5. career_roadmap_modules — evolve the pre-existing table if migration 27
--    already created it. New rows are enrollment-based; legacy columns remain
--    nullable for backwards compatibility.
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'career_roadmap_modules'
      AND column_name = 'enrollment_id'
  ) THEN
    ALTER TABLE public.career_roadmap_modules
      ADD COLUMN enrollment_id UUID REFERENCES public.career_roadmap_enrollment(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'career_roadmap_modules'
      AND column_name = 'template_id'
  ) THEN
    ALTER TABLE public.career_roadmap_modules
      ADD COLUMN template_id UUID REFERENCES public.roadmap_templates(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'career_roadmap_modules'
      AND column_name = 'estimated_minutes'
  ) THEN
    ALTER TABLE public.career_roadmap_modules
      ADD COLUMN estimated_minutes INT NOT NULL DEFAULT 60 CHECK (estimated_minutes >= 5);
  END IF;
END $$;

ALTER TABLE public.career_roadmap_modules
  ALTER COLUMN roadmap_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_roadmap_modules_enrollment
  ON public.career_roadmap_modules(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_modules_template
  ON public.career_roadmap_modules(template_id);

-- The new design stores rich content on roadmap_template_days and does not
-- expose legacy module arrays.
ALTER TABLE public.career_roadmap_modules
  DROP COLUMN IF EXISTS key_concepts,
  DROP COLUMN IF EXISTS tasks;

ALTER TABLE public.career_roadmap_enrollment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_roadmap_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_roadmap_modules    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own enrollments" ON public.career_roadmap_enrollment;
CREATE POLICY "Users can view own enrollments" ON public.career_roadmap_enrollment
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can start own enrollments" ON public.career_roadmap_enrollment;
CREATE POLICY "Users can start own enrollments" ON public.career_roadmap_enrollment
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own enrollments" ON public.career_roadmap_enrollment;
CREATE POLICY "Users can update own enrollments" ON public.career_roadmap_enrollment
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view own progress" ON public.career_roadmap_progress;
CREATE POLICY "Users can view own progress" ON public.career_roadmap_progress
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can mutate own progress" ON public.career_roadmap_progress;
CREATE POLICY "Users can mutate own progress" ON public.career_roadmap_progress
  FOR ALL USING (
    user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view own modules" ON public.career_roadmap_modules;
CREATE POLICY "Users can view own modules" ON public.career_roadmap_modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.career_roadmap_enrollment e
      WHERE e.id = enrollment_id
        AND e.user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins full access enrollments" ON public.career_roadmap_enrollment;
CREATE POLICY "Admins full access enrollments" ON public.career_roadmap_enrollment
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins full access progress" ON public.career_roadmap_progress;
CREATE POLICY "Admins full access progress" ON public.career_roadmap_progress
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins full access modules" ON public.career_roadmap_modules;
CREATE POLICY "Admins full access modules" ON public.career_roadmap_modules
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Roadmap day content is intentionally not public. Users receive rich content
-- only through fn_user_get_roadmap_day_details after the server verifies that
-- the requested day is unlocked. Admins retain direct CRUD access.
DROP POLICY IF EXISTS "Published days are public" ON public.roadmap_template_days;
DROP POLICY IF EXISTS "Admins full access template days" ON public.roadmap_template_days;
CREATE POLICY "Admins full access template days" ON public.roadmap_template_days
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


DROP FUNCTION IF EXISTS public.fn_admin_import_roadmap_json(UUID, JSONB);
CREATE OR REPLACE FUNCTION public.fn_admin_import_roadmap_json(
  p_template_id UUID,
  p_payload JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_day RECORD;
  v_count INT := 0;
  v_days JSONB;
  v_seen INT[] := '{}';
  v_n INT;
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

  FOR v_day IN
    SELECT
      (elem ->> 'day_number')::INT AS day_number,
      NULLIF(elem ->> 'title', '') AS title,
      NULLIF(elem ->> 'description', '') AS description,
      COALESCE(NULLIF((elem ->> 'estimated_minutes')::INT, 0), 60) AS estimated_minutes,
      COALESCE(
        (SELECT array_agg(value) FROM jsonb_array_elements_text(elem -> 'learning_objectives')),
        '{}'::TEXT[]
      ) AS learning_objectives,
      COALESCE(
        (SELECT array_agg(value) FROM jsonb_array_elements_text(elem -> 'study_materials')),
        '{}'::TEXT[]
      ) AS study_materials,
      COALESCE(
        (SELECT array_agg(value) FROM jsonb_array_elements_text(elem -> 'video_links')),
        '{}'::TEXT[]
      ) AS video_links,
      COALESCE(
        (SELECT array_agg(value) FROM jsonb_array_elements_text(elem -> 'pdfs')),
        '{}'::TEXT[]
      ) AS pdfs,
      COALESCE(
        (SELECT array_agg(value) FROM jsonb_array_elements_text(elem -> 'practice_tasks')),
        '{}'::TEXT[]
      ) AS practice_tasks,
      COALESCE(elem -> 'extra_resources', '[]'::jsonb) AS extra_resources,
      NULLIF(elem ->> 'mini_project', '') AS mini_project,
      NULLIF(elem ->> 'assignment', '') AS assignment,
      NULLIF(elem ->> 'notes', '') AS notes
    FROM jsonb_array_elements(v_days) elem
  LOOP
    IF v_day.day_number IS NULL OR v_day.day_number < 1 THEN
      RAISE EXCEPTION 'Invalid day_number "%" — must be a positive integer.', v_day.day_number
        USING ERRCODE = '23514';
    END IF;
    IF v_day.title IS NULL THEN
      RAISE EXCEPTION 'Day % is missing a title.', v_day.day_number
        USING ERRCODE = '23514';
    END IF;
    IF v_day.estimated_minutes IS NULL OR v_day.estimated_minutes < 5 THEN
      RAISE EXCEPTION 'Day % has invalid estimated_minutes (must be >= 5).', v_day.day_number
        USING ERRCODE = '23514';
    END IF;

    v_n := v_day.day_number;
    IF v_n = ANY(v_seen) THEN
      RAISE EXCEPTION 'Duplicate day_number "%" in payload — JSON import rejected.', v_n
        USING ERRCODE = '23514';
    END IF;
    v_seen := array_append(v_seen, v_n);
  END LOOP;

  -- Reject duplicates already present on the template.
  IF EXISTS (
    SELECT 1 FROM public.roadmap_template_days
    WHERE template_id = p_template_id
      AND day_number = ANY(v_seen)
  ) THEN
    RAISE EXCEPTION 'One or more day_numbers already exist on this template. JSON import rejected to prevent duplicates.'
      USING ERRCODE = '23514';
  END IF;

  -- Insert all days atomically.
  FOR v_day IN
    SELECT
      (elem ->> 'day_number')::INT AS day_number,
      NULLIF(elem ->> 'title', '') AS title,
      NULLIF(elem ->> 'description', '') AS description,
      COALESCE(NULLIF((elem ->> 'estimated_minutes')::INT, 0), 60) AS estimated_minutes,
      COALESCE(
        (SELECT array_agg(value) FROM jsonb_array_elements_text(elem -> 'learning_objectives')),
        '{}'::TEXT[]
      ) AS learning_objectives,
      COALESCE(
        (SELECT array_agg(value) FROM jsonb_array_elements_text(elem -> 'study_materials')),
        '{}'::TEXT[]
      ) AS study_materials,
      COALESCE(
        (SELECT array_agg(value) FROM jsonb_array_elements_text(elem -> 'video_links')),
        '{}'::TEXT[]
      ) AS video_links,
      COALESCE(
        (SELECT array_agg(value) FROM jsonb_array_elements_text(elem -> 'pdfs')),
        '{}'::TEXT[]
      ) AS pdfs,
      COALESCE(
        (SELECT array_agg(value) FROM jsonb_array_elements_text(elem -> 'practice_tasks')),
        '{}'::TEXT[]
      ) AS practice_tasks,
      COALESCE(elem -> 'extra_resources', '[]'::jsonb) AS extra_resources,
      NULLIF(elem ->> 'mini_project', '') AS mini_project,
      NULLIF(elem ->> 'assignment', '') AS assignment,
      NULLIF(elem ->> 'notes', '') AS notes
    FROM jsonb_array_elements(v_days) elem
  LOOP
    INSERT INTO public.roadmap_template_days (
      template_id, day_number, title, description, estimated_minutes,
      learning_objectives, study_materials, extra_resources,
      video_links, pdfs, practice_tasks, mini_project, assignment, notes
    ) VALUES (
      p_template_id, v_day.day_number, v_day.title, v_day.description, v_day.estimated_minutes,
      v_day.learning_objectives, v_day.study_materials, v_day.extra_resources,
      v_day.video_links, v_day.pdfs, v_day.practice_tasks,
      v_day.mini_project, v_day.assignment, v_day.notes
    );
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
-- 8b. fn_user_get_roadmap_day_details — server-enforced access to rich day
--     content. Users must own the enrollment AND the day must be unlocked.
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
    -- Always unlocked.
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
-- 8c. fn_admin_publish_roadmap_template — enforce that the template has a
--     main category before publishing.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_admin_publish_roadmap_template(UUID, BOOLEAN);
CREATE OR REPLACE FUNCTION public.fn_admin_publish_roadmap_template(
  p_id UUID, p_publish BOOLEAN
) RETURNS public.roadmap_templates LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.roadmap_templates;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to publish/archive a roadmap template.' USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL THEN RAISE EXCEPTION 'Roadmap template id is required.' USING ERRCODE = '23514'; END IF;

  SELECT * INTO v_row FROM public.roadmap_templates WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Roadmap template not found.' USING ERRCODE = 'P0002'; END IF;

  IF p_publish AND v_row.category_id IS NULL THEN
    RAISE EXCEPTION 'A main category is required before publishing.' USING ERRCODE = '23514';
  END IF;

  UPDATE public.roadmap_templates
  SET status = CASE WHEN p_publish THEN 'Published' ELSE 'Archived' END,
      updated_at = NOW()
  WHERE id = p_id
  RETURNING * INTO v_row;

  PERFORM public.fn_audit_log(
    CASE WHEN p_publish THEN 'PUBLISH_ROADMAP_TEMPLATE' ELSE 'ARCHIVE_ROADMAP_TEMPLATE' END,
    'roadmap_template', p_id::text);
  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_publish_roadmap_template(UUID, BOOLEAN) TO authenticated, service_role;

-- ============================================================================
-- 9. fn_user_enroll_roadmap — creates a new enrollment for the current user
--    and copies every day into career_roadmap_modules. A user can enroll in
--    the same template only once (UNIQUE constraint).
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_user_enroll_roadmap(UUID);
CREATE OR REPLACE FUNCTION public.fn_user_enroll_roadmap(p_template_id UUID)
RETURNS public.career_roadmap_enrollment
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile_id UUID;
  v_template public.roadmap_templates;
  v_day public.roadmap_template_days;
  v_enrollment public.career_roadmap_enrollment;
  v_unlocked_at TIMESTAMPTZ;
  v_existing INT;
BEGIN
  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = auth.uid();
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No profile for current user.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_template FROM public.roadmap_templates WHERE id = p_template_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Roadmap template not found.' USING ERRCODE = 'P0002';
  END IF;
  IF v_template.status <> 'Published' THEN
    RAISE EXCEPTION 'This roadmap is not currently published.' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO v_existing
    FROM public.career_roadmap_enrollment
    WHERE user_id = v_profile_id AND template_id = p_template_id;
  IF v_existing > 0 THEN
    RAISE EXCEPTION 'You are already enrolled in this roadmap.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.career_roadmap_enrollment (
    user_id, template_id, category_id, sub_category_id,
    title, total_days, status, current_day, completed_count, completion_pct
  ) VALUES (
    v_profile_id, v_template.id, v_template.category_id, v_template.sub_category_id,
    v_template.title, v_template.total_days, 'active', 1, 0, 0
  )
  RETURNING * INTO v_enrollment;

  -- Copy every day into career_roadmap_modules.
  FOR v_day IN
    SELECT * FROM public.roadmap_template_days
    WHERE template_id = p_template_id
    ORDER BY day_number ASC
  LOOP
    INSERT INTO public.career_roadmap_modules (
      enrollment_id, template_id, day_number, title, description,
      estimated_minutes, unlock_at
    ) VALUES (
      v_enrollment.id, v_template.id, v_day.day_number, v_day.title,
      v_day.description, v_day.estimated_minutes, NOW()
    );
  END LOOP;

  PERFORM public.fn_audit_log(
    'ENROLL_ROADMAP', 'career_roadmap_enrollment', v_enrollment.id::TEXT,
    jsonb_build_object('template_id', p_template_id, 'title', v_template.title)
  );

  RETURN v_enrollment;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_user_enroll_roadmap(UUID) TO authenticated;

-- ============================================================================
-- 10. fn_user_complete_roadmap_day — strict sequential completion per enrollment.
--     Day N unlocks only after Day N-1 is completed AND 24h have elapsed.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_user_complete_roadmap_day(UUID, INT);
CREATE OR REPLACE FUNCTION public.fn_user_complete_roadmap_day(
  p_enrollment_id UUID, p_day_number INT
) RETURNS public.career_roadmap_progress
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile_id UUID;
  v_enrollment public.career_roadmap_enrollment;
  v_prev public.career_roadmap_progress;
  v_progress public.career_roadmap_progress;
BEGIN
  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = auth.uid();
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No profile for current user.' USING ERRCODE = '42501';
  END IF;

  IF p_day_number IS NULL OR p_day_number < 1 THEN
    RAISE EXCEPTION 'Invalid day number.' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_enrollment FROM public.career_roadmap_enrollment
    WHERE id = p_enrollment_id AND user_id = v_profile_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No enrollment found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_enrollment.status <> 'active' THEN
    RAISE EXCEPTION 'This enrollment is not active.' USING ERRCODE = '42501';
  END IF;

  IF p_day_number > 1 THEN
    SELECT * INTO v_prev FROM public.career_roadmap_progress
      WHERE enrollment_id = p_enrollment_id
        AND day_number = p_day_number - 1
        AND is_completed = TRUE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'You must complete Day % before Day %.',
        p_day_number - 1, p_day_number USING ERRCODE = '42501';
    END IF;
    IF v_prev.completed_at IS NULL OR v_prev.completed_at > NOW() - INTERVAL '24 hours' THEN
      RAISE EXCEPTION 'Day % unlocks at least 24 hours after completing Day %. Please wait.',
        p_day_number, p_day_number - 1 USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Idempotent upsert.
  INSERT INTO public.career_roadmap_progress (
    user_id, enrollment_id, template_id, day_number, is_completed, completed_at
  ) VALUES (
    v_profile_id, p_enrollment_id, v_enrollment.template_id, p_day_number, TRUE, NOW()
  )
  ON CONFLICT (enrollment_id, day_number) DO UPDATE
    SET is_completed = TRUE,
        completed_at = COALESCE(public.career_roadmap_progress.completed_at, NOW())
  RETURNING * INTO v_progress;

  -- Recompute enrollment aggregates.
  UPDATE public.career_roadmap_enrollment e
  SET
    completed_count = COALESCE(sub.cnt, 0),
    current_day = LEAST(e.total_days, COALESCE(sub.cnt, 0) + 1),
    completion_pct = CASE
      WHEN e.total_days = 0 THEN 0
      ELSE ROUND(100.0 * COALESCE(sub.cnt, 0) / e.total_days)::INT
    END,
    status = CASE
      WHEN COALESCE(sub.cnt, 0) >= e.total_days THEN 'completed'
      ELSE e.status
    END,
    updated_at = NOW()
  FROM (
    SELECT enrollment_id, COUNT(*)::INT AS cnt
    FROM public.career_roadmap_progress
    WHERE enrollment_id = p_enrollment_id AND is_completed = TRUE
    GROUP BY enrollment_id
  ) sub
  WHERE e.id = p_enrollment_id;

  PERFORM public.fn_audit_log(
    'COMPLETE_ROADMAP_DAY', 'career_roadmap_enrollment', p_enrollment_id::TEXT,
    jsonb_build_object('day_number', p_day_number)
  );

  RETURN v_progress;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_user_complete_roadmap_day(UUID, INT)
  TO authenticated;

-- ============================================================================
-- 11. fn_admin_set_roadmap_thumbnail — store thumbnail URL on the template.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_admin_set_roadmap_thumbnail(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.fn_admin_set_roadmap_thumbnail(
  p_template_id UUID, p_thumbnail_url TEXT
) RETURNS public.roadmap_templates LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.roadmap_templates;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.roadmap_templates
    SET thumbnail_url = p_thumbnail_url, updated_at = NOW()
    WHERE id = p_template_id
    RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Roadmap template not found.' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_set_roadmap_thumbnail(UUID, TEXT)
  TO authenticated, service_role;

-- ============================================================================
-- 12. Enable Realtime on roadmap tables.
-- ============================================================================
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.roadmap_templates';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.roadmap_template_days';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.career_roadmap_enrollment';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.career_roadmap_progress';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.career_roadmap_modules';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

COMMIT;
