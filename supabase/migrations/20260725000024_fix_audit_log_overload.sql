-- Migration 24 - Resolve fn_audit_log overload ambiguity for roadmap templates.
--
-- Migration 13 created the 4-argument audit writer. Migration 21 later created
-- the enhanced 9-argument writer with defaults for its additional parameters.
-- PostgreSQL treats those defaults as making the 9-argument function callable
-- with four arguments, so both functions match the same PERFORM call.
--
-- Keep the enhanced writer as the single audit implementation, remove the
-- obsolete 4-argument overload, and make roadmap-template creation's audit
-- call explicitly typed.

BEGIN;

-- The enhanced function from migration 21 supersedes this legacy overload.
DROP FUNCTION IF EXISTS public.fn_audit_log(TEXT, TEXT, TEXT, JSONB);

-- Recreate only the roadmap-template creation RPC so the active audit call is
-- explicit about its PostgreSQL argument types. The enhanced fn_audit_log
-- remains the only audit writer and receives the omitted values via defaults.
CREATE OR REPLACE FUNCTION public.fn_admin_create_roadmap_template(
  p_category_id UUID, p_sub_category_id UUID, p_title TEXT, p_description TEXT,
  p_total_days INT, p_difficulty TEXT, p_status TEXT
) RETURNS public.roadmap_templates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_row public.roadmap_templates;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to create a roadmap template. Your current role is "%".', public.fn_current_role()
      USING ERRCODE = '42501';
  END IF;
  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION 'Roadmap title is required.' USING ERRCODE = '23514';
  END IF;
  IF p_total_days IS NULL OR p_total_days <= 0 THEN
    RAISE EXCEPTION 'Total days must be > 0.' USING ERRCODE = '23514';
  END IF;
  IF p_status NOT IN ('Draft', 'Published', 'Archived') THEN
    RAISE EXCEPTION 'Invalid status "%". Allowed: Draft, Published, Archived.', p_status
      USING ERRCODE = '23514';
  END IF;

  SELECT id INTO v_actor_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  INSERT INTO public.roadmap_templates (
    category_id, sub_category_id, title, description,
    total_days, difficulty, status, created_by
  )
  VALUES (
    p_category_id, p_sub_category_id, p_title, p_description,
    p_total_days, p_difficulty, p_status, v_actor_id
  )
  RETURNING * INTO v_row;

  PERFORM public.fn_audit_log(
    'CREATE_ROADMAP_TEMPLATE'::TEXT,
    'roadmap_template'::TEXT,
    v_row.id::TEXT,
    jsonb_build_object('title', p_title)::JSONB
  );

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_create_roadmap_template(
  UUID, UUID, TEXT, TEXT, INT, TEXT, TEXT
) TO authenticated, service_role;

COMMIT;
