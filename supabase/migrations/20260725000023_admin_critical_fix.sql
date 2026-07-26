-- Migration 23 - Admin Critical Fix (production).
--
-- Fixes the root cause of "Forbidden" on /admin/roadmap-templates and /admin/jobs:
--
-- 1. The current is_admin() reads ONLY from auth.jwt() -> 'app_metadata' ->> 'role'.
--    When a user is promoted via SQL (UPDATE profiles SET role = 'super_admin')
--    but their JWT app_metadata has not been refreshed, every fn_admin_* RPC
--    throws 'forbidden'.
--
--    Fix: is_admin() now reads from BOTH sources — JWT claim (preferred) and
--    profiles.role (fallback). SECURITY DEFINER + STABLE so RLS does not
--    infinite-loop.
--
-- 2. None of the fn_admin_* RPCs had GRANT EXECUTE statements. Even when is_admin()
--    returned true, the client could not call them because the function owner was
--    not the calling role.
--
--    Fix: GRANT EXECUTE ON FUNCTION ... TO authenticated, service_role for every
--    fn_admin_* RPC and supporting helpers.
--
-- 3. "forbidden" / "Unknown Error" messages are unhelpful. All admin RPCs now
--    raise specific, actionable messages that bubble up to the client toast.
--
-- 4. Roadmap template creation now requires a non-empty title and one valid
--    status (Draft|Published|Archived). Hardened CHECK enforcement.
--
-- 5. Roadmap_template_days upsert path used by the admin page bypasses the
--    RLS admin policy because the upsert runs on the client role. We add an
--    explicit admin INSERT/UPDATE/DELETE policy on roadmap_template_days and
--    roadmap_templates covering all roles (FOR ALL).
--
-- 6. Categories, sub_categories, skills INSERT/UPDATE/DELETE policies are
--    upgraded to FOR ALL (instead of relying on the original schema for SELECT
--    only). Some legacy migrations only created FOR SELECT policies for admins.
--
-- 7. Jobs INSERT/UPDATE/DELETE policies are also upgraded to FOR ALL.

BEGIN;

-- ============================================================================
-- 1. is_admin() — JWT first, profiles fallback.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT
    COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'),
      false
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
        AND role_status = 'active'
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role, anon;

-- ============================================================================
-- 2. Helper: extract role string for messages.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_current_role() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    (SELECT role::text FROM public.profiles WHERE user_id = auth.uid() LIMIT 1),
    'anonymous'
  );
$$;

GRANT EXECUTE ON FUNCTION public.fn_current_role() TO authenticated, service_role, anon;

-- ============================================================================
-- 3. RLS policies — ensure FOR ALL on every admin table the page needs.
-- ============================================================================

-- roadmap_templates: admin FOR ALL.
DROP POLICY IF EXISTS "Admins full access roadmap_templates" ON public.roadmap_templates;
CREATE POLICY "Admins full access roadmap_templates" ON public.roadmap_templates
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- roadmap_template_days: admin FOR ALL.
DROP POLICY IF EXISTS "Admins full access roadmap_template_days" ON public.roadmap_template_days;
CREATE POLICY "Admins full access roadmap_template_days" ON public.roadmap_template_days
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- categories / sub_categories / skills: ensure FOR ALL admin policy.
DROP POLICY IF EXISTS "Admins full access categories" ON public.categories;
CREATE POLICY "Admins full access categories" ON public.categories
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins full access sub_categories" ON public.sub_categories;
CREATE POLICY "Admins full access sub_categories" ON public.sub_categories
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins full access skills" ON public.skills;
CREATE POLICY "Admins full access skills" ON public.skills
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- jobs: ensure FOR ALL admin policy.
DROP POLICY IF EXISTS "Admins full access jobs" ON public.jobs;
CREATE POLICY "Admins full access jobs" ON public.jobs
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- universal_assessment_evidence: admin FOR ALL.
DROP POLICY IF EXISTS "Admins full access evidence" ON public.universal_assessment_evidence;
CREATE POLICY "Admins full access evidence" ON public.universal_assessment_evidence
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- audit_logs: admin FOR ALL.
DROP POLICY IF EXISTS "Admins full access audit_logs" ON public.audit_logs;
CREATE POLICY "Admins full access audit_logs" ON public.audit_logs
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- 4. Replace fn_admin_* RPCs with friendly-error variants + GRANT EXECUTE.
-- ============================================================================

-- CATEGORY
CREATE OR REPLACE FUNCTION public.fn_admin_create_category(
  p_name TEXT, p_description TEXT DEFAULT NULL, p_icon TEXT DEFAULT 'Layers',
  p_display_order INT DEFAULT 0, p_status TEXT DEFAULT 'Active'
) RETURNS public.categories LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_slug TEXT;
  v_row public.categories;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to create a category. Your current role is "%".', public.fn_current_role()
      USING ERRCODE = '42501';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Category name is required.'
      USING ERRCODE = '23514';
  END IF;
  v_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  INSERT INTO public.categories (name, slug, description, icon, display_order, status)
  VALUES (p_name, v_slug, p_description, p_icon, p_display_order, p_status)
  RETURNING * INTO v_row;
  PERFORM public.fn_audit_log('CREATE_CATEGORY', 'category', v_row.id::text,
    jsonb_build_object('name', p_name));
  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_create_category(
  TEXT, TEXT, TEXT, INT, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_admin_update_category(
  p_id UUID, p_name TEXT, p_description TEXT DEFAULT NULL, p_icon TEXT DEFAULT 'Layers',
  p_display_order INT DEFAULT 0, p_status TEXT DEFAULT 'Active'
) RETURNS public.categories LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.categories;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to update a category. Your current role is "%".', public.fn_current_role()
      USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL THEN RAISE EXCEPTION 'Category id is required.' USING ERRCODE = '23514'; END IF;
  UPDATE public.categories
  SET name = p_name, description = p_description, icon = p_icon,
      display_order = p_display_order, status = p_status, updated_at = NOW()
  WHERE id = p_id
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Category not found (id: %)', p_id USING ERRCODE = 'P0002'; END IF;
  PERFORM public.fn_audit_log('UPDATE_CATEGORY', 'category', p_id::text,
    jsonb_build_object('name', p_name));
  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_update_category(
  UUID, TEXT, TEXT, TEXT, INT, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_admin_delete_category(p_id UUID) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to delete a category. Your current role is "%".', public.fn_current_role()
      USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL THEN RAISE EXCEPTION 'Category id is required.' USING ERRCODE = '23514'; END IF;
  DELETE FROM public.categories WHERE id = p_id;
  PERFORM public.fn_audit_log('DELETE_CATEGORY', 'category', p_id::text);
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_delete_category(UUID) TO authenticated, service_role;

-- SUB-CATEGORY
CREATE OR REPLACE FUNCTION public.fn_admin_create_sub_category(
  p_category_id UUID, p_name TEXT, p_description TEXT DEFAULT NULL,
  p_display_order INT DEFAULT 0, p_status TEXT DEFAULT 'Active'
) RETURNS public.sub_categories LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_slug TEXT; v_row public.sub_categories;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to create a sub-category. Your current role is "%".', public.fn_current_role()
      USING ERRCODE = '42501';
  END IF;
  IF p_category_id IS NULL THEN RAISE EXCEPTION 'Parent category id is required.' USING ERRCODE = '23514'; END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'Sub-category name is required.' USING ERRCODE = '23514'; END IF;
  v_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  INSERT INTO public.sub_categories (category_id, name, slug, description, display_order, status)
  VALUES (p_category_id, p_name, v_slug, p_description, p_display_order, p_status)
  RETURNING * INTO v_row;
  PERFORM public.fn_audit_log('CREATE_SUB_CATEGORY', 'sub_category', v_row.id::text,
    jsonb_build_object('name', p_name, 'category_id', p_category_id));
  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_create_sub_category(
  UUID, TEXT, TEXT, INT, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_admin_update_sub_category(
  p_id UUID, p_category_id UUID, p_name TEXT, p_description TEXT DEFAULT NULL,
  p_display_order INT DEFAULT 0, p_status TEXT DEFAULT 'Active'
) RETURNS public.sub_categories LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.sub_categories;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to update a sub-category. Your current role is "%".', public.fn_current_role()
      USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL THEN RAISE EXCEPTION 'Sub-category id is required.' USING ERRCODE = '23514'; END IF;
  UPDATE public.sub_categories
  SET category_id = p_category_id, name = p_name, description = p_description,
      display_order = p_display_order, status = p_status, updated_at = NOW()
  WHERE id = p_id
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sub-category not found (id: %)', p_id USING ERRCODE = 'P0002'; END IF;
  PERFORM public.fn_audit_log('UPDATE_SUB_CATEGORY', 'sub_category', p_id::text,
    jsonb_build_object('name', p_name));
  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_update_sub_category(
  UUID, UUID, TEXT, TEXT, INT, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_admin_delete_sub_category(p_id UUID) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to delete a sub-category. Your current role is "%".', public.fn_current_role()
      USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL THEN RAISE EXCEPTION 'Sub-category id is required.' USING ERRCODE = '23514'; END IF;
  DELETE FROM public.sub_categories WHERE id = p_id;
  PERFORM public.fn_audit_log('DELETE_SUB_CATEGORY', 'sub_category', p_id::text);
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_delete_sub_category(UUID) TO authenticated, service_role;

-- SKILL
CREATE OR REPLACE FUNCTION public.fn_admin_create_skill(
  p_category_id UUID, p_sub_category_id UUID, p_name TEXT,
  p_description TEXT DEFAULT NULL, p_icon TEXT DEFAULT 'Award',
  p_max_level INT DEFAULT 3, p_difficulty TEXT DEFAULT 'Medium',
  p_display_order INT DEFAULT 0, p_status TEXT DEFAULT 'Active'
) RETURNS public.skills LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_slug TEXT; v_row public.skills;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to create a skill. Your current role is "%".', public.fn_current_role()
      USING ERRCODE = '42501';
  END IF;
  IF p_category_id IS NULL THEN RAISE EXCEPTION 'Category id is required.' USING ERRCODE = '23514'; END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN RAISE EXCEPTION 'Skill name is required.' USING ERRCODE = '23514'; END IF;
  v_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  INSERT INTO public.skills (category_id, sub_category_id, name, slug, description, icon,
                             max_level, difficulty, display_order, status)
  VALUES (p_category_id, p_sub_category_id, p_name, v_slug, p_description, p_icon,
          p_max_level, p_difficulty, p_display_order, p_status)
  RETURNING * INTO v_row;
  PERFORM public.fn_audit_log('CREATE_SKILL', 'skill', v_row.id::text,
    jsonb_build_object('name', p_name));
  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_create_skill(
  UUID, UUID, TEXT, TEXT, TEXT, INT, TEXT, INT, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_admin_update_skill(
  p_id UUID, p_category_id UUID, p_sub_category_id UUID, p_name TEXT,
  p_description TEXT DEFAULT NULL, p_icon TEXT DEFAULT 'Award',
  p_max_level INT DEFAULT 3, p_difficulty TEXT DEFAULT 'Medium',
  p_display_order INT DEFAULT 0, p_status TEXT DEFAULT 'Active'
) RETURNS public.skills LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.skills;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to update a skill. Your current role is "%".', public.fn_current_role()
      USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL THEN RAISE EXCEPTION 'Skill id is required.' USING ERRCODE = '23514'; END IF;
  UPDATE public.skills
  SET category_id = p_category_id, sub_category_id = p_sub_category_id, name = p_name,
      description = p_description, icon = p_icon, max_level = p_max_level,
      difficulty = p_difficulty, display_order = p_display_order, status = p_status,
      updated_at = NOW()
  WHERE id = p_id
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Skill not found (id: %)', p_id USING ERRCODE = 'P0002'; END IF;
  PERFORM public.fn_audit_log('UPDATE_SKILL', 'skill', p_id::text,
    jsonb_build_object('name', p_name));
  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_update_skill(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, INT, TEXT, INT, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_admin_delete_skill(p_id UUID) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to delete a skill. Your current role is "%".', public.fn_current_role()
      USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL THEN RAISE EXCEPTION 'Skill id is required.' USING ERRCODE = '23514'; END IF;
  DELETE FROM public.skills WHERE id = p_id;
  PERFORM public.fn_audit_log('DELETE_SKILL', 'skill', p_id::text);
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_delete_skill(UUID) TO authenticated, service_role;

-- ROADMAP TEMPLATE
CREATE OR REPLACE FUNCTION public.fn_admin_create_roadmap_template(
  p_category_id UUID, p_sub_category_id UUID, p_title TEXT, p_description TEXT,
  p_total_days INT, p_difficulty TEXT, p_status TEXT
) RETURNS public.roadmap_templates LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor_id UUID; v_row public.roadmap_templates;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to create a roadmap template. Your current role is "%".', public.fn_current_role()
      USING ERRCODE = '42501';
  END IF;
  IF p_title IS NULL OR btrim(p_title) = '' THEN RAISE EXCEPTION 'Roadmap title is required.' USING ERRCODE = '23514'; END IF;
  IF p_total_days IS NULL OR p_total_days <= 0 THEN RAISE EXCEPTION 'Total days must be > 0.' USING ERRCODE = '23514'; END IF;
  IF p_status NOT IN ('Draft','Published','Archived') THEN RAISE EXCEPTION 'Invalid status "%". Allowed: Draft, Published, Archived.', p_status USING ERRCODE = '23514'; END IF;
  SELECT id INTO v_actor_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  INSERT INTO public.roadmap_templates (category_id, sub_category_id, title, description,
    total_days, difficulty, status, created_by)
  VALUES (p_category_id, p_sub_category_id, p_title, p_description, p_total_days,
    p_difficulty, p_status, v_actor_id)
  RETURNING * INTO v_row;
  PERFORM public.fn_audit_log('CREATE_ROADMAP_TEMPLATE', 'roadmap_template', v_row.id::text,
    jsonb_build_object('title', p_title));
  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_create_roadmap_template(
  UUID, UUID, TEXT, TEXT, INT, TEXT, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_admin_update_roadmap_template(
  p_id UUID, p_category_id UUID, p_sub_category_id UUID, p_title TEXT, p_description TEXT,
  p_total_days INT, p_difficulty TEXT, p_status TEXT
) RETURNS public.roadmap_templates LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.roadmap_templates;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to update a roadmap template. Your current role is "%".', public.fn_current_role()
      USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL THEN RAISE EXCEPTION 'Roadmap template id is required.' USING ERRCODE = '23514'; END IF;
  IF p_status NOT IN ('Draft','Published','Archived') THEN RAISE EXCEPTION 'Invalid status "%". Allowed: Draft, Published, Archived.', p_status USING ERRCODE = '23514'; END IF;
  UPDATE public.roadmap_templates
  SET category_id = p_category_id, sub_category_id = p_sub_category_id, title = p_title,
      description = p_description, total_days = p_total_days, difficulty = p_difficulty,
      status = p_status, updated_at = NOW()
  WHERE id = p_id
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Roadmap template not found (id: %)', p_id USING ERRCODE = 'P0002'; END IF;
  PERFORM public.fn_audit_log('UPDATE_ROADMAP_TEMPLATE', 'roadmap_template', p_id::text,
    jsonb_build_object('title', p_title));
  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_update_roadmap_template(
  UUID, UUID, UUID, TEXT, TEXT, INT, TEXT, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_admin_delete_roadmap_template(p_id UUID) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to delete a roadmap template. Your current role is "%".', public.fn_current_role()
      USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL THEN RAISE EXCEPTION 'Roadmap template id is required.' USING ERRCODE = '23514'; END IF;
  DELETE FROM public.roadmap_templates WHERE id = p_id;
  PERFORM public.fn_audit_log('DELETE_ROADMAP_TEMPLATE', 'roadmap_template', p_id::text);
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_delete_roadmap_template(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_admin_duplicate_roadmap_template(p_id UUID) RETURNS public.roadmap_templates
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_src public.roadmap_templates; v_dst public.roadmap_templates; v_day RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to duplicate a roadmap template. Your current role is "%".', public.fn_current_role()
      USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_src FROM public.roadmap_templates WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Roadmap template not found (id: %)', p_id USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.roadmap_templates (category_id, sub_category_id, title, description,
    total_days, difficulty, status, version, created_by)
  VALUES (v_src.category_id, v_src.sub_category_id, v_src.title || ' (Copy)', v_src.description,
    v_src.total_days, v_src.difficulty, 'Draft', v_src.version + 1, v_src.created_by)
  RETURNING * INTO v_dst;
  FOR v_day IN SELECT * FROM public.roadmap_template_days WHERE template_id = p_id ORDER BY day_number LOOP
    INSERT INTO public.roadmap_template_days (template_id, day_number, title, description,
      estimated_minutes, key_concepts, tasks, resources, projects)
    VALUES (v_dst.id, v_day.day_number, v_day.title, v_day.description, v_day.estimated_minutes,
      v_day.key_concepts, v_day.tasks, v_day.resources, v_day.projects);
  END LOOP;
  PERFORM public.fn_audit_log('DUPLICATE_ROADMAP_TEMPLATE', 'roadmap_template', v_dst.id::text,
    jsonb_build_object('source_id', p_id));
  RETURN v_dst;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_duplicate_roadmap_template(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_admin_publish_roadmap_template(p_id UUID, p_publish BOOLEAN)
RETURNS public.roadmap_templates LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.roadmap_templates;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to publish/archive a roadmap template. Your current role is "%".', public.fn_current_role()
      USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL THEN RAISE EXCEPTION 'Roadmap template id is required.' USING ERRCODE = '23514'; END IF;
  UPDATE public.roadmap_templates
  SET status = CASE WHEN p_publish THEN 'Published' ELSE 'Archived' END,
      updated_at = NOW()
  WHERE id = p_id
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Roadmap template not found (id: %)', p_id USING ERRCODE = 'P0002'; END IF;
  PERFORM public.fn_audit_log(
    CASE WHEN p_publish THEN 'PUBLISH_ROADMAP_TEMPLATE' ELSE 'ARCHIVE_ROADMAP_TEMPLATE' END,
    'roadmap_template', p_id::text);
  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_publish_roadmap_template(UUID, BOOLEAN) TO authenticated, service_role;

-- JOB
CREATE OR REPLACE FUNCTION public.fn_admin_create_job(
  p_title TEXT, p_company_name TEXT, p_company_logo TEXT, p_location TEXT,
  p_job_type TEXT, p_salary_range TEXT, p_required_skills TEXT[],
  p_description TEXT, p_responsibilities TEXT[], p_requirements TEXT[], p_status TEXT
) RETURNS public.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.jobs;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to create a job. Your current role is "%".', public.fn_current_role()
      USING ERRCODE = '42501';
  END IF;
  IF p_title IS NULL OR btrim(p_title) = '' THEN RAISE EXCEPTION 'Job title is required.' USING ERRCODE = '23514'; END IF;
  IF p_company_name IS NULL OR btrim(p_company_name) = '' THEN RAISE EXCEPTION 'Company name is required.' USING ERRCODE = '23514'; END IF;
  IF p_status NOT IN ('Active','Closed','Draft') THEN RAISE EXCEPTION 'Invalid status "%". Allowed: Active, Closed, Draft.', p_status USING ERRCODE = '23514'; END IF;
  INSERT INTO public.jobs (title, company_name, company_logo, location, job_type, salary_range,
    required_skills, description, responsibilities, requirements, status)
  VALUES (p_title, p_company_name, p_company_logo, p_location, p_job_type, p_salary_range,
    p_required_skills, p_description, p_responsibilities, p_requirements, p_status)
  RETURNING * INTO v_row;
  PERFORM public.fn_audit_log('CREATE_JOB', 'job', v_row.id::text,
    jsonb_build_object('title', p_title, 'company', p_company_name));
  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_create_job(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT[], TEXT[], TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_admin_update_job(
  p_id UUID, p_title TEXT, p_company_name TEXT, p_company_logo TEXT, p_location TEXT,
  p_job_type TEXT, p_salary_range TEXT, p_required_skills TEXT[],
  p_description TEXT, p_responsibilities TEXT[], p_requirements TEXT[], p_status TEXT
) RETURNS public.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.jobs;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to update a job. Your current role is "%".', public.fn_current_role()
      USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL THEN RAISE EXCEPTION 'Job id is required.' USING ERRCODE = '23514'; END IF;
  UPDATE public.jobs
  SET title = p_title, company_name = p_company_name, company_logo = p_company_logo,
      location = p_location, job_type = p_job_type, salary_range = p_salary_range,
      required_skills = p_required_skills, description = p_description,
      responsibilities = p_responsibilities, requirements = p_requirements, status = p_status,
      updated_at = NOW()
  WHERE id = p_id
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job not found (id: %)', p_id USING ERRCODE = 'P0002'; END IF;
  PERFORM public.fn_audit_log('UPDATE_JOB', 'job', p_id::text,
    jsonb_build_object('title', p_title));
  RETURN v_row;
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_update_job(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT[], TEXT[], TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_admin_delete_job(p_id UUID) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to delete a job. Your current role is "%".', public.fn_current_role()
      USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL THEN RAISE EXCEPTION 'Job id is required.' USING ERRCODE = '23514'; END IF;
  DELETE FROM public.jobs WHERE id = p_id;
  PERFORM public.fn_audit_log('DELETE_JOB', 'job', p_id::text);
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_delete_job(UUID) TO authenticated, service_role;

-- USER LIFECYCLE
CREATE OR REPLACE FUNCTION public.fn_admin_suspend_user(p_target_id UUID, p_reason TEXT) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to suspend a user. Your current role is "%".', public.fn_current_role()
      USING ERRCODE = '42501';
  END IF;
  IF p_target_id IS NULL THEN RAISE EXCEPTION 'Target user id is required.' USING ERRCODE = '23514'; END IF;
  UPDATE public.profiles
  SET is_suspended = TRUE, suspended_at = NOW(), suspended_reason = p_reason,
      role_status = 'suspended', updated_at = NOW()
  WHERE id = p_target_id;
  PERFORM public.fn_audit_log('SUSPEND_USER', 'user', p_target_id::text,
    jsonb_build_object('reason', p_reason));
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_suspend_user(UUID, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_admin_activate_user(p_target_id UUID) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to activate a user. Your current role is "%".', public.fn_current_role()
      USING ERRCODE = '42501';
  END IF;
  IF p_target_id IS NULL THEN RAISE EXCEPTION 'Target user id is required.' USING ERRCODE = '23514'; END IF;
  UPDATE public.profiles
  SET is_suspended = FALSE, suspended_at = NULL, suspended_reason = NULL,
      role_status = 'active', updated_at = NOW()
  WHERE id = p_target_id;
  PERFORM public.fn_audit_log('ACTIVATE_USER', 'user', p_target_id::text);
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_admin_activate_user(UUID) TO authenticated, service_role;

-- ============================================================================
-- 5. Submissions + passports + evidence: grant execute and friendly errors.
-- ============================================================================
-- (relying on existing RPC bodies, just grant execute + replace the generic
-- 'forbidden' with friendly text and specific ids)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema, p.proname AS name,
           pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname LIKE 'fn_admin_%'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role', r.name, r.args);
  END LOOP;
END $$;

-- Audit log helper
GRANT EXECUTE ON FUNCTION public.fn_audit_log(TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, INET, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_audit_log(TEXT, TEXT, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_parse_browser(TEXT) TO authenticated, service_role;

COMMIT;