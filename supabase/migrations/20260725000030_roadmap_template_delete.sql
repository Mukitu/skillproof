-- Migration 30 - Roadmap Template Deletion (transactional, cascade-aware).
--
-- Replaces fn_admin_delete_roadmap_template with a version that:
--   * Counts every dependent row (legacy assignments, current enrollments,
--     user progress, per-enrollment modules, template days).
--   * When p_cascade = false and dependents exist, returns
--     {"ok": false, "blocked": true, "dependents": {...}}
--     so the UI can show "X active enrollments exist" instead of leaking
--     a PostgreSQL FK error.
--   * When p_cascade = true, deletes every dependent row in the same
--     transaction and then the template. Returns
--     {"ok": true, "deleted": {...}}.
--   * Wrapped in an EXCEPTION handler so any unexpected database error
--     becomes a JSONB-friendly response rather than a raw exception.
--   * Realtime refresh is untouched: the underlying DELETE statements
--     trigger normal REPLICA IDENTITY / publication events on every
--     affected table, so any admin page subscribed via supabase_realtime
--     refreshes automatically.

BEGIN;

-- ============================================================================
-- 1. fn_admin_delete_roadmap_template — cascade-aware deletion.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_admin_delete_roadmap_template(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS public.fn_admin_delete_roadmap_template(UUID);

CREATE OR REPLACE FUNCTION public.fn_admin_delete_roadmap_template(
  p_id UUID,
  p_cascade BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template            public.roadmap_templates;
  v_legacy_assignments  INT := 0;
  v_enrollments         INT := 0;
  v_progress_rows       INT := 0;
  v_module_rows         INT := 0;
  v_day_rows            INT := 0;
  v_user_ids            UUID[] := '{}';
  v_payload             JSONB;
BEGIN
  -- ------------------------------------------------------------------
  -- Auth + validation
  -- ------------------------------------------------------------------
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'error', 'Admin role required to delete a roadmap template.',
      'code', 'NOT_ADMIN'
    );
  END IF;

  IF p_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'error', 'Roadmap template id is required.',
      'code', 'INVALID_INPUT'
    );
  END IF;

  SELECT * INTO v_template FROM public.roadmap_templates WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'error', 'Roadmap template not found.',
      'code', 'NOT_FOUND',
      'template_id', p_id
    );
  END IF;

  -- ------------------------------------------------------------------
  -- Count every dependent row. Use COUNT(*) so the response is exact.
  -- ------------------------------------------------------------------
  SELECT COUNT(*) INTO v_legacy_assignments
    FROM public.career_roadmap_assignments
    WHERE template_id = p_id;

  SELECT COUNT(*) INTO v_enrollments
    FROM public.career_roadmap_enrollment
    WHERE template_id = p_id;

  SELECT COUNT(*) INTO v_progress_rows
    FROM public.career_roadmap_progress
    WHERE template_id = p_id;

  SELECT COUNT(*) INTO v_module_rows
    FROM public.career_roadmap_modules
    WHERE template_id = p_id;

  SELECT COUNT(*) INTO v_day_rows
    FROM public.roadmap_template_days
    WHERE template_id = p_id;

  -- Capture affected user ids for the audit log when we are cascading.
  IF p_cascade THEN
    SELECT array_agg(DISTINCT e.user_id) INTO v_user_ids
      FROM public.career_roadmap_enrollment e
      WHERE e.template_id = p_id;
  END IF;

  -- ------------------------------------------------------------------
  -- Non-cascade path: block deletion when dependents exist.
  -- ------------------------------------------------------------------
  IF NOT p_cascade AND (
       v_legacy_assignments > 0
    OR v_enrollments        > 0
    OR v_progress_rows      > 0
    OR v_module_rows        > 0
  ) THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'blocked', TRUE,
      'error', format(
        'Cannot delete roadmap "%s" because %s active enrollment%s and %s legacy assignment%s depend on it. Confirm cascade deletion to proceed.',
        v_template.title,
        v_enrollments,
        CASE WHEN v_enrollments = 1 THEN '' ELSE 's' END,
        v_legacy_assignments,
        CASE WHEN v_legacy_assignments = 1 THEN '' ELSE 's' END
      ),
      'code', 'HAS_DEPENDENTS',
      'template_id', p_id,
      'dependents', jsonb_build_object(
        'legacy_assignments', v_legacy_assignments,
        'enrollments',        v_enrollments,
        'progress_rows',      v_progress_rows,
        'module_rows',        v_module_rows,
        'template_days',      v_day_rows,
        'affected_user_count', COALESCE(array_length(v_user_ids, 1), 0)
      )
    );
  END IF;

  -- ------------------------------------------------------------------
  -- Cascade path: delete every dependent row in a single transaction.
  -- Any RAISE EXCEPTION inside (e.g. permissions, FK) aborts everything.
  -- ------------------------------------------------------------------
  IF p_cascade THEN
    -- 1. Per-enrollment progress first (FK to enrollment).
    DELETE FROM public.career_roadmap_progress
      WHERE enrollment_id IN (
        SELECT id FROM public.career_roadmap_enrollment WHERE template_id = p_id
      );

    -- 2. Per-enrollment modules (FK to enrollment).
    DELETE FROM public.career_roadmap_modules
      WHERE enrollment_id IN (
        SELECT id FROM public.career_roadmap_enrollment WHERE template_id = p_id
      );

    -- 3. Remove any progress rows that reference the template directly
    --    (legacy rows where enrollment_id is null but template_id is set).
    DELETE FROM public.career_roadmap_progress
      WHERE template_id = p_id;

    -- 4. Remove legacy assignments (RESTRICT FK on template_id).
    DELETE FROM public.career_roadmap_assignments WHERE template_id = p_id;

    -- 5. Remove all current enrollments.
    DELETE FROM public.career_roadmap_enrollment WHERE template_id = p_id;

    -- 6. Remove template days (FKey CASCADE will cover it, but we run it
    --    explicitly so the deleted count is exact).
    DELETE FROM public.roadmap_template_days WHERE template_id = p_id;

    -- 7. Finally remove the template itself.
    DELETE FROM public.roadmap_templates WHERE id = p_id;
  ELSE
    -- Non-cascade path with NO dependents is safe.
    DELETE FROM public.roadmap_template_days WHERE template_id = p_id;
    DELETE FROM public.roadmap_templates      WHERE id = p_id;
  END IF;

  -- ------------------------------------------------------------------
  -- Audit log (best-effort: do not fail the whole delete if logging fails).
  -- ------------------------------------------------------------------
  BEGIN
    PERFORM public.fn_audit_log(
      'DELETE_ROADMAP_TEMPLATE',
      'roadmap_template',
      p_id::text,
      jsonb_build_object(
        'cascaded', p_cascade,
        'template_title', v_template.title,
        'deleted', jsonb_build_object(
          'legacy_assignments', v_legacy_assignments,
          'enrollments',        v_enrollments,
          'progress_rows',      v_progress_rows,
          'module_rows',        v_module_rows,
          'template_days',      v_day_rows
        ),
        'affected_user_count', COALESCE(array_length(v_user_ids, 1), 0)
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Audit log is informational only.
    NULL;
  END;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'cascaded', p_cascade,
    'template_id', p_id,
    'deleted', jsonb_build_object(
      'legacy_assignments', v_legacy_assignments,
      'enrollments',        v_enrollments,
      'progress_rows',      v_progress_rows,
      'module_rows',        v_module_rows,
      'template_days',      v_day_rows,
      'affected_user_count', COALESCE(array_length(v_user_ids, 1), 0)
    )
  );

EXCEPTION WHEN OTHERS THEN
  -- Any unexpected database error becomes a JSONB-friendly response
  -- so the UI never sees a raw PostgreSQL message.
  RETURN jsonb_build_object(
    'ok', FALSE,
    'error', COALESCE(SQLERRM, 'Unknown database error.'),
    'code', COALESCE(SQLSTATE, 'DB_ERROR'),
    'template_id', p_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_delete_roadmap_template(UUID, BOOLEAN)
  TO authenticated, service_role;

-- ============================================================================
-- 2. fn_admin_roadmap_template_stats — return dependent counts so the UI can
--    decide whether to confirm cascade or hide the delete button entirely.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_admin_roadmap_template_stats(UUID);
CREATE OR REPLACE FUNCTION public.fn_admin_roadmap_template_stats(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template            public.roadmap_templates;
  v_legacy_assignments  INT := 0;
  v_enrollments         INT := 0;
  v_progress_rows       INT := 0;
  v_module_rows         INT := 0;
  v_day_rows            INT := 0;
  v_affected_users      INT := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required.' USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'Template id is required.' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_template FROM public.roadmap_templates WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Roadmap template not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT COUNT(*) INTO v_legacy_assignments
    FROM public.career_roadmap_assignments WHERE template_id = p_id;
  SELECT COUNT(*) INTO v_enrollments
    FROM public.career_roadmap_enrollment WHERE template_id = p_id;
  SELECT COUNT(*) INTO v_progress_rows
    FROM public.career_roadmap_progress WHERE template_id = p_id;
  SELECT COUNT(*) INTO v_module_rows
    FROM public.career_roadmap_modules WHERE template_id = p_id;
  SELECT COUNT(*) INTO v_day_rows
    FROM public.roadmap_template_days WHERE template_id = p_id;

  SELECT COUNT(DISTINCT user_id) INTO v_affected_users
    FROM public.career_roadmap_enrollment WHERE template_id = p_id;

  RETURN jsonb_build_object(
    'template_id', p_id,
    'template_title', v_template.title,
    'deleted_count', 0,
    'dependents', jsonb_build_object(
      'legacy_assignments', v_legacy_assignments,
      'enrollments',        v_enrollments,
      'progress_rows',      v_progress_rows,
      'module_rows',        v_module_rows,
      'template_days',      v_day_rows,
      'affected_user_count', v_affected_users
    ),
    'has_dependents', (
      v_legacy_assignments > 0
      OR v_enrollments   > 0
      OR v_progress_rows > 0
      OR v_module_rows   > 0
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_roadmap_template_stats(UUID)
  TO authenticated, service_role;

-- ============================================================================
-- 3. Supabase Realtime publication — make sure the new enrollment / progress
--    / modules / days tables are part of the realtime channel so list pages
--    refresh automatically when a delete cascades through dependents.
-- ============================================================================
DO $$
BEGIN
  -- Idempotent subscriptions.
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.roadmap_templates';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.roadmap_template_days';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.career_roadmap_enrollment';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.career_roadmap_progress';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.career_roadmap_modules';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

COMMIT;