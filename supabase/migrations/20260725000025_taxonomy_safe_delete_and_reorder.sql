-- Migration 25 - Taxonomy safe delete + reorder.
--
-- Goals:
--   1. Category deletion must remove sub-categories AND every descendant skill
--      in one transaction (no orphans). Sub-category deletion must remove its
--      child skills. Skill deletion must affect only the selected skill.
--   2. Persist accurate row counts to identify not-found rows.
--   3. Add a whitelisted reorder RPC that re-numbers display_order in a single
--      transaction for one taxonomy level.
--   4. Repair existing taxonomy orphans conservatively (skills missing both
--      category and sub-category, or whose category_id does not match a valid
--      sub-category's parent).
--   5. Keep all authorization in is_admin(); keep auditing via fn_audit_log.
--   6. Grant EXECUTE to authenticated and service_role.

BEGIN;

-- ============================================================================
-- 0. Repair existing orphans (idempotent, safe).
-- ============================================================================

-- Delete skills that have no parent context at all.
DELETE FROM public.skills
 WHERE category_id IS NULL
   AND sub_category_id IS NULL;

-- Fix skills whose category_id is wrong but sub_category_id points to a real
-- sub-category: re-derive category_id from the sub-category.
UPDATE public.skills s
   SET category_id = sc.category_id
  FROM public.sub_categories sc
 WHERE s.sub_category_id = sc.id
   AND s.category_id IS DISTINCT FROM sc.category_id;

-- Delete skills whose sub_category_id references a non-existent sub-category.
DELETE FROM public.skills s
 WHERE s.sub_category_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.sub_categories sc WHERE sc.id = s.sub_category_id);

-- Delete sub-categories whose category_id references a non-existent category.
DELETE FROM public.sub_categories sc
 WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.id = sc.category_id);

-- ============================================================================
-- 1. fn_admin_delete_category — explicit cascade.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_admin_delete_category(UUID);
CREATE OR REPLACE FUNCTION public.fn_admin_delete_category(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category public.categories;
  v_sub_count INT;
  v_skill_count INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to delete a category. Your current role is "%".',
      public.fn_current_role() USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'Category id is required.' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_category FROM public.categories WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category not found (id: %)', p_id USING ERRCODE = 'P0002';
  END IF;

  -- Count + delete skills attached to category or any of its sub-categories.
  WITH target_skills AS (
    SELECT id FROM public.skills
     WHERE category_id = p_id
        OR sub_category_id IN (SELECT id FROM public.sub_categories WHERE category_id = p_id)
  )
  DELETE FROM public.skills WHERE id IN (SELECT id FROM target_skills);
  GET DIAGNOSTICS v_skill_count = ROW_COUNT;

  -- Delete sub-categories (cascade handles their dependents).
  DELETE FROM public.sub_categories WHERE category_id = p_id;
  GET DIAGNOSTICS v_sub_count = ROW_COUNT;

  -- Delete the category itself.
  DELETE FROM public.categories WHERE id = p_id;

  PERFORM public.fn_audit_log(
    'DELETE_CATEGORY',
    'category',
    p_id::TEXT,
    jsonb_build_object(
      'name', v_category.name,
      'deleted_sub_categories', v_sub_count,
      'deleted_skills', v_skill_count
    )
  );

  RETURN jsonb_build_object(
    'category_id', p_id,
    'deleted_sub_categories', v_sub_count,
    'deleted_skills', v_skill_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_delete_category(UUID) TO authenticated, service_role;

-- ============================================================================
-- 2. fn_admin_delete_sub_category — explicit child-skill cleanup.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_admin_delete_sub_category(UUID);
CREATE OR REPLACE FUNCTION public.fn_admin_delete_sub_category(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.sub_categories;
  v_skill_count INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to delete a sub-category. Your current role is "%".',
      public.fn_current_role() USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'Sub-category id is required.' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_sub FROM public.sub_categories WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sub-category not found (id: %)', p_id USING ERRCODE = 'P0002';
  END IF;

  -- Delete child skills explicitly so we never leave orphans.
  DELETE FROM public.skills WHERE sub_category_id = p_id;
  GET DIAGNOSTICS v_skill_count = ROW_COUNT;

  DELETE FROM public.sub_categories WHERE id = p_id;

  PERFORM public.fn_audit_log(
    'DELETE_SUB_CATEGORY',
    'sub_category',
    p_id::TEXT,
    jsonb_build_object(
      'name', v_sub.name,
      'category_id', v_sub.category_id,
      'deleted_skills', v_skill_count
    )
  );

  RETURN jsonb_build_object(
    'sub_category_id', p_id,
    'deleted_skills', v_skill_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_delete_sub_category(UUID) TO authenticated, service_role;

-- ============================================================================
-- 3. fn_admin_delete_skill — single-row delete with explicit not-found.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_admin_delete_skill(UUID);
CREATE OR REPLACE FUNCTION public.fn_admin_delete_skill(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_skill public.skills;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to delete a skill. Your current role is "%".',
      public.fn_current_role() USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'Skill id is required.' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_skill FROM public.skills WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Skill not found (id: %)', p_id USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.skills WHERE id = p_id;

  PERFORM public.fn_audit_log(
    'DELETE_SKILL',
    'skill',
    p_id::TEXT,
    jsonb_build_object('name', v_skill.name, 'category_id', v_skill.category_id)
  );

  RETURN jsonb_build_object('skill_id', p_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_delete_skill(UUID) TO authenticated, service_role;

-- ============================================================================
-- 4. fn_admin_move_sub_category — change parent category.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_admin_move_sub_category(
  p_id UUID, p_new_category_id UUID
) RETURNS public.sub_categories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.sub_categories;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required.' USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL OR p_new_category_id IS NULL THEN
    RAISE EXCEPTION 'Both sub-category id and new category id are required.' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE id = p_new_category_id) THEN
    RAISE EXCEPTION 'Target category does not exist.' USING ERRCODE = '23503';
  END IF;

  UPDATE public.sub_categories
     SET category_id = p_new_category_id, updated_at = NOW()
   WHERE id = p_id
   RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sub-category not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Re-home child skills to the new category so they stay consistent.
  UPDATE public.skills
     SET category_id = p_new_category_id, updated_at = NOW()
   WHERE sub_category_id = p_id
     AND category_id IS DISTINCT FROM p_new_category_id;

  PERFORM public.fn_audit_log(
    'MOVE_SUB_CATEGORY', 'sub_category', p_id::TEXT,
    jsonb_build_object('new_category_id', p_new_category_id)
  );

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_move_sub_category(UUID, UUID)
  TO authenticated, service_role;

-- ============================================================================
-- 5. fn_admin_move_skill — change parent category and/or sub-category.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_admin_move_skill(
  p_id UUID, p_new_category_id UUID, p_new_sub_category_id UUID DEFAULT NULL
) RETURNS public.skills
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.skills;
  v_resolved_category UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required.' USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL OR p_new_category_id IS NULL THEN
    RAISE EXCEPTION 'Skill id and category id are required.' USING ERRCODE = '23514';
  END IF;

  -- If a sub-category is given, verify it belongs to the new category.
  IF p_new_sub_category_id IS NOT NULL THEN
    SELECT category_id INTO v_resolved_category
      FROM public.sub_categories WHERE id = p_new_sub_category_id;
    IF v_resolved_category IS NULL THEN
      RAISE EXCEPTION 'Target sub-category does not exist.' USING ERRCODE = '23503';
    END IF;
    IF v_resolved_category IS DISTINCT FROM p_new_category_id THEN
      RAISE EXCEPTION 'Sub-category does not belong to the supplied category.' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE id = p_new_category_id) THEN
      RAISE EXCEPTION 'Target category does not exist.' USING ERRCODE = '23503';
    END IF;
  END IF;

  UPDATE public.skills
     SET category_id = p_new_category_id,
         sub_category_id = p_new_sub_category_id,
         updated_at = NOW()
   WHERE id = p_id
   RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Skill not found.' USING ERRCODE = 'P0002';
  END IF;

  PERFORM public.fn_audit_log(
    'MOVE_SKILL', 'skill', p_id::TEXT,
    jsonb_build_object(
      'new_category_id', p_new_category_id,
      'new_sub_category_id', p_new_sub_category_id
    )
  );

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_move_skill(UUID, UUID, UUID)
  TO authenticated, service_role;

-- ============================================================================
-- 6. fn_admin_reorder_taxonomy — assign contiguous display_order within a level.
--    p_level is one of: 'categories', 'sub_categories', 'skills'.
--    p_scope_category_id is required for sub_categories/skills (their parent).
--    p_scope_sub_category_id is required for skills under a sub-category.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_admin_reorder_taxonomy(
  p_level TEXT,
  p_ordered_ids UUID[],
  p_scope_category_id UUID DEFAULT NULL,
  p_scope_sub_category_id UUID DEFAULT NULL
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_id TEXT;
  v_index INT := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to reorder taxonomy.' USING ERRCODE = '42501';
  END IF;
  IF p_level NOT IN ('categories', 'sub_categories', 'skills') THEN
    RAISE EXCEPTION 'Invalid taxonomy level "%". Allowed: categories, sub_categories, skills.',
      p_level USING ERRCODE = '23514';
  END IF;
  IF p_level IN ('sub_categories', 'skills') AND p_scope_category_id IS NULL THEN
    RAISE EXCEPTION 'Scope category id is required for level "%".', p_level USING ERRCODE = '23514';
  END IF;
  IF p_level = 'skills' AND p_scope_sub_category_id IS NULL THEN
    RAISE EXCEPTION 'Scope sub-category id is required when reordering skills under a sub-category.'
      USING ERRCODE = '23514';
  END IF;

  -- Validate that each id actually belongs to the supplied scope.
  IF p_level = 'categories' THEN
    IF EXISTS (
      SELECT 1 FROM unnest(p_ordered_ids) AS u(id)
       WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.id = u.id)
    ) THEN
      RAISE EXCEPTION 'One or more category ids are invalid.' USING ERRCODE = '23514';
    END IF;
  ELSIF p_level = 'sub_categories' THEN
    IF EXISTS (
      SELECT 1 FROM unnest(p_ordered_ids) AS u(id)
       WHERE NOT EXISTS (
         SELECT 1 FROM public.sub_categories sc
          WHERE sc.id = u.id AND sc.category_id = p_scope_category_id
       )
    ) THEN
      RAISE EXCEPTION 'One or more sub-category ids are invalid for the supplied category.'
        USING ERRCODE = '23514';
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM unnest(p_ordered_ids) AS u(id)
       WHERE NOT EXISTS (
         SELECT 1 FROM public.skills s
          WHERE s.id = u.id
            AND s.sub_category_id = p_scope_sub_category_id
            AND s.category_id = p_scope_category_id
       )
    ) THEN
      RAISE EXCEPTION 'One or more skill ids are invalid for the supplied scope.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Re-number display_order contiguously.
  FOREACH v_id IN ARRAY p_ordered_ids LOOP
    v_index := v_index + 10;
    EXECUTE format('UPDATE public.%I SET display_order = $1, updated_at = NOW() WHERE id = $2', p_level)
      USING v_index, v_id::UUID;
  END LOOP;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  PERFORM public.fn_audit_log(
    'REORDER_TAXONOMY', p_level, NULL,
    jsonb_build_object(
      'count', v_count,
      'scope_category_id', p_scope_category_id,
      'scope_sub_category_id', p_scope_sub_category_id,
      'ordered_ids', p_ordered_ids
    )
  );

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_reorder_taxonomy(TEXT, UUID[], UUID, UUID)
  TO authenticated, service_role;

-- ============================================================================
-- 7. fn_admin_set_taxonomy_status — toggle Active/Draft/Archived for one row.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_admin_set_taxonomy_status(
  p_level TEXT, p_id UUID, p_status TEXT
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required.' USING ERRCODE = '42501';
  END IF;
  IF p_level NOT IN ('categories', 'sub_categories', 'skills') THEN
    RAISE EXCEPTION 'Invalid taxonomy level.' USING ERRCODE = '23514';
  END IF;
  IF p_status NOT IN ('Active', 'Draft', 'Archived') THEN
    RAISE EXCEPTION 'Invalid status "%". Allowed: Active, Draft, Archived.', p_status
      USING ERRCODE = '23514';
  END IF;

  EXECUTE format(
    'UPDATE public.%I SET status = $1, updated_at = NOW() WHERE id = $2', p_level
  ) USING p_status, p_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'Record not found.' USING ERRCODE = 'P0002';
  END IF;

  PERFORM public.fn_audit_log(
    CASE p_status
      WHEN 'Active' THEN 'ACTIVATE_TAXONOMY'
      WHEN 'Archived' THEN 'ARCHIVE_TAXONOMY'
      ELSE 'DRAFT_TAXONOMY'
    END,
    p_level, p_id::TEXT, jsonb_build_object('status', p_status)
  );

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_set_taxonomy_status(TEXT, UUID, TEXT)
  TO authenticated, service_role;

-- ============================================================================
-- 8. fn_admin_taxonomy_stats — counts of children for cascade confirmations.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_admin_taxonomy_stats(p_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'category_id', p_id,
    'sub_categories', (
      SELECT COUNT(*) FROM public.sub_categories WHERE category_id = p_id
    ),
    'skills_direct', (
      SELECT COUNT(*) FROM public.skills
       WHERE category_id = p_id
         AND sub_category_id IS NULL
    ),
    'skills_via_sub', (
      SELECT COUNT(*) FROM public.skills s
       JOIN public.sub_categories sc ON sc.id = s.sub_category_id
        WHERE sc.category_id = p_id
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_taxonomy_stats(UUID) TO authenticated, service_role;

-- ============================================================================
-- 9. fn_admin_sub_category_stats — counts for sub-category cascade confirmations.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_admin_sub_category_stats(p_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'sub_category_id', p_id,
    'skills', (
      SELECT COUNT(*) FROM public.skills WHERE sub_category_id = p_id
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_sub_category_stats(UUID) TO authenticated, service_role;

COMMIT;
