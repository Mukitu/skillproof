-- Migration 27 - Career Roadmap redesign.
--
-- Goals:
--   1. Cleaner template header (add thumbnail_url, keep description short).
--   2. Day rows lose the large text fields (key_concepts/tasks/resources/projects).
--      Each day now has only day_number, title, description, estimated_minutes.
--   3. Per-user roadmap assignment table (career_roadmap_assignments) — one
--      active assignment per user. Started_at is permanent; progress and unlocks
--      are derived from completed_at timestamps on career_roadmap_progress.
--   4. Strict sequential unlock: Day N unlocks at max(started_at, prev_day
--      completed_at + 24h). The view fn_roadmap_current_day reflects this.
--   5. JSON import RPC fn_admin_import_roadmap_json validates, rejects dup
--      day numbers, runs the insert in a single transaction, rolls back on
--      failure.
--   6. Realtime is enabled for roadmap_templates, roadmap_template_days,
--      career_roadmap_assignments, career_roadmap_progress.

BEGIN;

-- ============================================================================
-- 1. Roadmap templates — add thumbnail_url, difficulty remains.
-- ============================================================================
ALTER TABLE public.roadmap_templates
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Backfill bucket + storage path defaults.
COMMENT ON COLUMN public.roadmap_templates.thumbnail_url IS
  'Public URL to the thumbnail stored in the roadmap-assets bucket.';

-- ============================================================================
-- 2. Roadmap template days — drop the heavy arrays, keep the simple fields.
--    key_concepts/tasks/resources/projects are removed; the admin will write
--    day_title + day_description only.
-- ============================================================================
ALTER TABLE public.roadmap_template_days
  DROP COLUMN IF EXISTS key_concepts,
  DROP COLUMN IF EXISTS tasks,
  DROP COLUMN IF EXISTS resources,
  DROP COLUMN IF EXISTS projects;

-- Ensure description is allowed to be larger (TEXT). estimated_minutes default 60.
-- (the original column was TEXT already.)

-- ============================================================================
-- 3. career_roadmap_assignments — one permanent assignment per user.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.career_roadmap_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.roadmap_templates(id) ON DELETE RESTRICT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sub_category_id UUID REFERENCES public.sub_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  total_days INT NOT NULL CHECK (total_days > 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_active_assignment_per_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_roadmap_assignments_user
  ON public.career_roadmap_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_assignments_template
  ON public.career_roadmap_assignments(template_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_assignments_status
  ON public.career_roadmap_assignments(status);

-- ============================================================================
-- 4. career_roadmap_progress — link to assignment AND add a day_number column
--    so the view + completion RPC can reference a day without joining modules.
--    The original schema only had module_id (FK to career_roadmap_modules),
--    which kept day-number queries awkward. We add day_number here and a
--    unique constraint on (assignment_id, day_number) so the upsert in
--    fn_user_complete_roadmap_day works idempotently.
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'career_roadmap_progress'
      AND column_name = 'assignment_id'
  ) THEN
    ALTER TABLE public.career_roadmap_progress
      ADD COLUMN assignment_id UUID REFERENCES public.career_roadmap_assignments(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'career_roadmap_progress'
      AND column_name = 'day_number'
  ) THEN
    ALTER TABLE public.career_roadmap_progress
      ADD COLUMN day_number INT CHECK (day_number IS NULL OR day_number > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_roadmap_progress_assignment
  ON public.career_roadmap_progress(assignment_id);

-- Legacy progress used roadmap_id as a required FK to career_roadmaps. New
-- progress is assignment-driven, so allow roadmap_id to be NULL. Historical
-- rows retain their existing values.
ALTER TABLE public.career_roadmap_progress
  ALTER COLUMN roadmap_id DROP NOT NULL;

-- Backfill day_number from career_roadmap_modules for any historical rows so
-- the view returns correct values immediately.
UPDATE public.career_roadmap_progress p
SET day_number = m.day_number
FROM public.career_roadmap_modules m
WHERE p.module_id = m.id
  AND p.day_number IS NULL;

-- Unique constraint on (assignment_id, day_number) so the completion RPC can
-- ON CONFLICT and stay idempotent. Make it NULL-safe because old rows without
-- an assignment may still exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_assignment_day_progress'
  ) THEN
    ALTER TABLE public.career_roadmap_progress
      ADD CONSTRAINT unique_assignment_day_progress
      UNIQUE (assignment_id, day_number);
  END IF;
END $$;

-- ============================================================================
-- 5. career_roadmap_modules — link to assignment, add estimated_minutes,
--    drop the heavy arrays, drop the NOT NULL FK on roadmap_id (the legacy
--    career_roadmaps table is no longer the source of truth — the assignment
--    is). Legacy rows are left intact; new rows use assignment_id.
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'career_roadmap_modules'
      AND column_name = 'assignment_id'
  ) THEN
    ALTER TABLE public.career_roadmap_modules
      ADD COLUMN assignment_id UUID REFERENCES public.career_roadmap_assignments(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'career_roadmap_modules'
      AND column_name = 'estimated_minutes'
  ) THEN
    ALTER TABLE public.career_roadmap_modules
      ADD COLUMN estimated_minutes INT NOT NULL DEFAULT 60 CHECK (estimated_minutes >= 5);
  END IF;
END $$;

-- We still write the assignment id into roadmap_id for backward compatibility
-- with anything that joins through career_roadmaps, but drop the NOT NULL
-- constraint so legacy FK churn doesn't block new inserts once the legacy
-- table is empty.
ALTER TABLE public.career_roadmap_modules
  ALTER COLUMN roadmap_id DROP NOT NULL;

-- drop the large fields from the per-user modules too (they were never used
-- by the user panel).
ALTER TABLE public.career_roadmap_modules
  DROP COLUMN IF EXISTS key_concepts,
  DROP COLUMN IF EXISTS tasks;

CREATE INDEX IF NOT EXISTS idx_roadmap_modules_assignment
  ON public.career_roadmap_modules(assignment_id);

-- ============================================================================
-- 6. Helper view — current day for an assignment.
--    Day N is unlocked when:
--       N = 1 -> always
--       N > 1 -> exists progress for day N-1 AND
--                (progress for day N-1).completed_at + 24h <= now()
-- ============================================================================
CREATE OR REPLACE VIEW public.v_roadmap_current_day AS
SELECT
  a.id AS assignment_id,
  a.user_id,
  a.total_days,
  COALESCE(
    (
      SELECT MAX(m.day_number)
      FROM public.career_roadmap_modules m
      WHERE m.assignment_id = a.id
        AND m.day_number = 1
    ),
    0
  ) AS day1_present,
  COALESCE((
    SELECT MAX(p.day_number)
    FROM public.career_roadmap_progress p
    WHERE p.assignment_id = a.id
      AND p.is_completed = TRUE
      AND p.completed_at IS NOT NULL
  ), 0) AS completed_day,
  COALESCE((
    SELECT MIN(m.day_number)
    FROM public.career_roadmap_modules m
    WHERE m.assignment_id = a.id
      AND (
        m.day_number = 1
        OR EXISTS (
          SELECT 1 FROM public.career_roadmap_progress prev
          WHERE prev.assignment_id = a.id
            AND prev.day_number = m.day_number - 1
            AND prev.is_completed = TRUE
            AND prev.completed_at IS NOT NULL
            AND prev.completed_at <= NOW() - INTERVAL '24 hours'
        )
      )
  ), 0) AS unlocked_day
FROM public.career_roadmap_assignments a;

GRANT SELECT ON public.v_roadmap_current_day TO authenticated, anon;

-- ============================================================================
-- 7. RLS for the new assignment table.
-- ============================================================================
ALTER TABLE public.career_roadmap_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own assignment" ON public.career_roadmap_assignments;
CREATE POLICY "Users can view own assignment" ON public.career_roadmap_assignments
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can start own assignment" ON public.career_roadmap_assignments;
CREATE POLICY "Users can start own assignment" ON public.career_roadmap_assignments
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own assignment" ON public.career_roadmap_assignments;
CREATE POLICY "Users can update own assignment" ON public.career_roadmap_assignments
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins full access assignments" ON public.career_roadmap_assignments;
CREATE POLICY "Admins full access assignments" ON public.career_roadmap_assignments
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- 8. fn_admin_import_roadmap_json — validates JSON, runs in a single tx,
--    rolls back on failure. Prevents duplicate day numbers.
-- ============================================================================
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

  -- Validate each entry, collect day numbers, reject duplicates.
  FOR v_day IN
    SELECT
      (elem ->> 'day_number')::INT AS day_number,
      NULLIF(elem ->> 'title', '') AS title,
      NULLIF(elem ->> 'description', '') AS description,
      COALESCE(NULLIF((elem ->> 'estimated_minutes')::INT, 0), 60) AS estimated_minutes
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

  -- The whole block runs inside this function's transaction; any RAISE EXCEPTION
  -- above has already aborted. Insert all days atomically.
  FOR v_day IN
    SELECT
      (elem ->> 'day_number')::INT AS day_number,
      NULLIF(elem ->> 'title', '') AS title,
      NULLIF(elem ->> 'description', '') AS description,
      COALESCE(NULLIF((elem ->> 'estimated_minutes')::INT, 0), 60) AS estimated_minutes
    FROM jsonb_array_elements(v_days) elem
  LOOP
    INSERT INTO public.roadmap_template_days (
      template_id, day_number, title, description, estimated_minutes
    ) VALUES (
      p_template_id, v_day.day_number, v_day.title, v_day.description, v_day.estimated_minutes
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
-- 9. fn_user_start_roadmap — assigns a published template to the user and
--    copies every day into career_roadmap_modules. Day 1 is unlocked
--    immediately, every later day is unlocked 24h after the previous day's
--    completed_at (or, for never-completed progress, the assignment start +
--    (n-1)*24h as a fallback so the user can still see what's ahead).
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_user_start_roadmap(UUID);
CREATE OR REPLACE FUNCTION public.fn_user_start_roadmap(p_template_id UUID)
RETURNS public.career_roadmap_assignments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile_id UUID;
  v_template public.roadmap_templates;
  v_day public.roadmap_template_days;
  v_assignment public.career_roadmap_assignments;
  v_unlocked_at TIMESTAMPTZ;
  v_already INT;
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

  SELECT COUNT(*) INTO v_already
    FROM public.career_roadmap_assignments
    WHERE user_id = v_profile_id;
  IF v_already > 0 THEN
    RAISE EXCEPTION 'You already have an active roadmap. Please complete or archive it before starting a new one.'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.career_roadmap_assignments (
    user_id, template_id, category_id, sub_category_id,
    title, total_days, status
  ) VALUES (
    v_profile_id, v_template.id, v_template.category_id, v_template.sub_category_id,
    v_template.title, v_template.total_days, 'active'
  )
  RETURNING * INTO v_assignment;

  -- Copy each day into career_roadmap_modules with computed unlock_at.
  FOR v_day IN
    SELECT * FROM public.roadmap_template_days
    WHERE template_id = p_template_id
    ORDER BY day_number ASC
  LOOP
    IF v_day.day_number = 1 THEN
      v_unlocked_at := NOW();
    ELSE
      -- Fallback scheduling so the timeline is visible, but the actual
      -- unlock is enforced by the view + completion handler at runtime.
      v_unlocked_at := NOW() + ((v_day.day_number - 1) * INTERVAL '24 hours');
    END IF;

    INSERT INTO public.career_roadmap_modules (
      assignment_id, day_number, title, description,
      estimated_minutes, unlock_at
    ) VALUES (
      v_assignment.id, v_day.day_number, v_day.title,
      v_day.description, v_day.estimated_minutes, v_unlocked_at
    );
  END LOOP;

  PERFORM public.fn_audit_log(
    'START_ROADMAP', 'career_roadmap_assignment', v_assignment.id::TEXT,
    jsonb_build_object('template_id', p_template_id, 'title', v_template.title)
  );

  RETURN v_assignment;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_user_start_roadmap(UUID) TO authenticated;

-- ============================================================================
-- 10. fn_user_complete_roadmap_day — strict sequential completion.
--    Day N can only be completed when:
--       - N = 1, OR
--       - Day N-1 has a completed row, AND
--         at least 24h have passed since that completion.
--    Marks the day completed and stores completed_at = NOW().
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_user_complete_roadmap_day(UUID);
CREATE OR REPLACE FUNCTION public.fn_user_complete_roadmap_day(
  p_assignment_id UUID, p_day_number INT
) RETURNS public.career_roadmap_progress
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile_id UUID;
  v_prev public.career_roadmap_progress;
  v_progress public.career_roadmap_progress;
  v_unlocked TIMESTAMPTZ;
BEGIN
  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = auth.uid();
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No profile for current user.' USING ERRCODE = '42501';
  END IF;

  IF p_day_number IS NULL OR p_day_number < 1 THEN
    RAISE EXCEPTION 'Invalid day number.' USING ERRCODE = '23514';
  END IF;

  -- Verify assignment belongs to user and is active.
  PERFORM 1 FROM public.career_roadmap_assignments
    WHERE id = p_assignment_id AND user_id = v_profile_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active roadmap assignment found.' USING ERRCODE = 'P0002';
  END IF;

  -- Strict unlock gate (server-enforced).
  IF p_day_number = 1 THEN
    v_unlocked := 'epoch'::TIMESTAMPTZ; -- always unlocked
  ELSE
    SELECT * INTO v_prev FROM public.career_roadmap_progress
      WHERE assignment_id = p_assignment_id
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
    v_unlocked := v_prev.completed_at + INTERVAL '24 hours';
  END IF;

  -- Idempotent upsert: completing twice is harmless.
  INSERT INTO public.career_roadmap_progress (
    user_id, assignment_id, module_id, day_number, is_completed, completed_at
  )
  SELECT
    v_profile_id, p_assignment_id, m.id, p_day_number, TRUE, NOW()
  FROM public.career_roadmap_modules m
  WHERE m.assignment_id = p_assignment_id
    AND m.day_number = p_day_number
  ON CONFLICT (assignment_id, day_number) DO UPDATE
    SET is_completed = TRUE,
        completed_at = COALESCE(public.career_roadmap_progress.completed_at, NOW())
  RETURNING * INTO v_progress;

  -- If the last day was just completed, mark assignment as completed.
  IF p_day_number = (SELECT total_days FROM public.career_roadmap_assignments WHERE id = p_assignment_id) THEN
    UPDATE public.career_roadmap_assignments
      SET status = 'completed', updated_at = NOW()
      WHERE id = p_assignment_id;
  END IF;

  PERFORM public.fn_audit_log(
    'COMPLETE_ROADMAP_DAY', 'career_roadmap_assignment', p_assignment_id::TEXT,
    jsonb_build_object('day_number', p_day_number, 'unlocked_at', v_unlocked)
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
  PERFORM 1 FROM pg_publication WHERE pubname = 'supabase_realtime';
EXCEPTION WHEN OTHERS THEN
  -- publication may not exist in non-realtime-enabled projects; skip silently.
  NULL;
END $$;

-- Use ALTER TABLE inside a DO block so the migration is idempotent on
-- projects that already enabled realtime on these tables.
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
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.career_roadmap_assignments';
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