-- Migration 14 - Admin RPCs (taxonomy, roadmaps, jobs, users, bulk, export, import, review, passport).

BEGIN;

-- 1. Categories
CREATE OR REPLACE FUNCTION public.fn_admin_create_category(
  p_name TEXT, p_description TEXT DEFAULT NULL, p_icon TEXT DEFAULT 'Layers',
  p_display_order INT DEFAULT 0, p_status TEXT DEFAULT 'Active'
) RETURNS public.categories LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_slug TEXT;
  v_row public.categories;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  v_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  INSERT INTO public.categories (name, slug, description, icon, display_order, status)
  VALUES (p_name, v_slug, p_description, p_icon, p_display_order, p_status)
  RETURNING * INTO v_row;
  PERFORM public.fn_audit_log('CREATE_CATEGORY', 'category', v_row.id::text,
    jsonb_build_object('name', p_name));
  RETURN v_row;
END; $$;

CREATE OR REPLACE FUNCTION public.fn_admin_update_category(
  p_id UUID, p_name TEXT, p_description TEXT DEFAULT NULL, p_icon TEXT DEFAULT 'Layers',
  p_display_order INT DEFAULT 0, p_status TEXT DEFAULT 'Active'
) RETURNS public.categories LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.categories;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.categories
  SET name = p_name, description = p_description, icon = p_icon,
      display_order = p_display_order, status = p_status, updated_at = NOW()
  WHERE id = p_id
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'category not found'; END IF;
  PERFORM public.fn_audit_log('UPDATE_CATEGORY', 'category', p_id::text,
    jsonb_build_object('name', p_name));
  RETURN v_row;
END; $$;

CREATE OR REPLACE FUNCTION public.fn_admin_delete_category(p_id UUID) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.categories WHERE id = p_id;
  PERFORM public.fn_audit_log('DELETE_CATEGORY', 'category', p_id::text);
END; $$;

-- 2. Sub-categories
CREATE OR REPLACE FUNCTION public.fn_admin_create_sub_category(
  p_category_id UUID, p_name TEXT, p_description TEXT DEFAULT NULL,
  p_display_order INT DEFAULT 0, p_status TEXT DEFAULT 'Active'
) RETURNS public.sub_categories LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_slug TEXT;
  v_row public.sub_categories;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  v_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  INSERT INTO public.sub_categories (category_id, name, slug, description, display_order, status)
  VALUES (p_category_id, p_name, v_slug, p_description, p_display_order, p_status)
  RETURNING * INTO v_row;
  PERFORM public.fn_audit_log('CREATE_SUB_CATEGORY', 'sub_category', v_row.id::text,
    jsonb_build_object('name', p_name, 'category_id', p_category_id));
  RETURN v_row;
END; $$;

CREATE OR REPLACE FUNCTION public.fn_admin_update_sub_category(
  p_id UUID, p_category_id UUID, p_name TEXT, p_description TEXT DEFAULT NULL,
  p_display_order INT DEFAULT 0, p_status TEXT DEFAULT 'Active'
) RETURNS public.sub_categories LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.sub_categories;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.sub_categories
  SET category_id = p_category_id, name = p_name, description = p_description,
      display_order = p_display_order, status = p_status, updated_at = NOW()
  WHERE id = p_id
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'sub_category not found'; END IF;
  PERFORM public.fn_audit_log('UPDATE_SUB_CATEGORY', 'sub_category', p_id::text,
    jsonb_build_object('name', p_name));
  RETURN v_row;
END; $$;

CREATE OR REPLACE FUNCTION public.fn_admin_delete_sub_category(p_id UUID) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.sub_categories WHERE id = p_id;
  PERFORM public.fn_audit_log('DELETE_SUB_CATEGORY', 'sub_category', p_id::text);
END; $$;

-- 3. Skills
CREATE OR REPLACE FUNCTION public.fn_admin_create_skill(
  p_category_id UUID, p_sub_category_id UUID, p_name TEXT,
  p_description TEXT DEFAULT NULL, p_icon TEXT DEFAULT 'Award',
  p_max_level INT DEFAULT 3, p_difficulty TEXT DEFAULT 'Medium',
  p_display_order INT DEFAULT 0, p_status TEXT DEFAULT 'Active'
) RETURNS public.skills LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_slug TEXT;
  v_row public.skills;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
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

CREATE OR REPLACE FUNCTION public.fn_admin_update_skill(
  p_id UUID, p_category_id UUID, p_sub_category_id UUID, p_name TEXT,
  p_description TEXT DEFAULT NULL, p_icon TEXT DEFAULT 'Award',
  p_max_level INT DEFAULT 3, p_difficulty TEXT DEFAULT 'Medium',
  p_display_order INT DEFAULT 0, p_status TEXT DEFAULT 'Active'
) RETURNS public.skills LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.skills;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.skills
  SET category_id = p_category_id, sub_category_id = p_sub_category_id, name = p_name,
      description = p_description, icon = p_icon, max_level = p_max_level,
      difficulty = p_difficulty, display_order = p_display_order, status = p_status,
      updated_at = NOW()
  WHERE id = p_id
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'skill not found'; END IF;
  PERFORM public.fn_audit_log('UPDATE_SKILL', 'skill', p_id::text,
    jsonb_build_object('name', p_name));
  RETURN v_row;
END; $$;

CREATE OR REPLACE FUNCTION public.fn_admin_delete_skill(p_id UUID) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.skills WHERE id = p_id;
  PERFORM public.fn_audit_log('DELETE_SKILL', 'skill', p_id::text);
END; $$;

-- 4. Roadmap templates
CREATE OR REPLACE FUNCTION public.fn_admin_create_roadmap_template(
  p_category_id UUID, p_sub_category_id UUID, p_title TEXT, p_description TEXT,
  p_total_days INT, p_difficulty TEXT, p_status TEXT
) RETURNS public.roadmap_templates LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_id UUID;
  v_row public.roadmap_templates;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
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

CREATE OR REPLACE FUNCTION public.fn_admin_update_roadmap_template(
  p_id UUID, p_category_id UUID, p_sub_category_id UUID, p_title TEXT, p_description TEXT,
  p_total_days INT, p_difficulty TEXT, p_status TEXT
) RETURNS public.roadmap_templates LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.roadmap_templates;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.roadmap_templates
  SET category_id = p_category_id, sub_category_id = p_sub_category_id, title = p_title,
      description = p_description, total_days = p_total_days, difficulty = p_difficulty,
      status = p_status, updated_at = NOW()
  WHERE id = p_id
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'roadmap template not found'; END IF;
  PERFORM public.fn_audit_log('UPDATE_ROADMAP_TEMPLATE', 'roadmap_template', p_id::text,
    jsonb_build_object('title', p_title));
  RETURN v_row;
END; $$;

CREATE OR REPLACE FUNCTION public.fn_admin_delete_roadmap_template(p_id UUID) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.roadmap_templates WHERE id = p_id;
  PERFORM public.fn_audit_log('DELETE_ROADMAP_TEMPLATE', 'roadmap_template', p_id::text);
END; $$;

CREATE OR REPLACE FUNCTION public.fn_admin_duplicate_roadmap_template(p_id UUID) RETURNS public.roadmap_templates
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_src public.roadmap_templates;
  v_dst public.roadmap_templates;
  v_day RECORD;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_src FROM public.roadmap_templates WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'roadmap template not found'; END IF;
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

CREATE OR REPLACE FUNCTION public.fn_admin_publish_roadmap_template(p_id UUID, p_publish BOOLEAN)
RETURNS public.roadmap_templates LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.roadmap_templates;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.roadmap_templates
  SET status = CASE WHEN p_publish THEN 'Published' ELSE 'Archived' END,
      updated_at = NOW()
  WHERE id = p_id
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'roadmap template not found'; END IF;
  PERFORM public.fn_audit_log(
    CASE WHEN p_publish THEN 'PUBLISH_ROADMAP_TEMPLATE' ELSE 'ARCHIVE_ROADMAP_TEMPLATE' END,
    'roadmap_template', p_id::text);
  RETURN v_row;
END; $$;

-- 5. Jobs
CREATE OR REPLACE FUNCTION public.fn_admin_create_job(
  p_title TEXT, p_company_name TEXT, p_company_logo TEXT, p_location TEXT,
  p_job_type TEXT, p_salary_range TEXT, p_required_skills TEXT[],
  p_description TEXT, p_responsibilities TEXT[], p_requirements TEXT[], p_status TEXT
) RETURNS public.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.jobs;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.jobs (title, company_name, company_logo, location, job_type, salary_range,
    required_skills, description, responsibilities, requirements, status)
  VALUES (p_title, p_company_name, p_company_logo, p_location, p_job_type, p_salary_range,
    p_required_skills, p_description, p_responsibilities, p_requirements, p_status)
  RETURNING * INTO v_row;
  PERFORM public.fn_audit_log('CREATE_JOB', 'job', v_row.id::text,
    jsonb_build_object('title', p_title, 'company', p_company_name));
  RETURN v_row;
END; $$;

CREATE OR REPLACE FUNCTION public.fn_admin_update_job(
  p_id UUID, p_title TEXT, p_company_name TEXT, p_company_logo TEXT, p_location TEXT,
  p_job_type TEXT, p_salary_range TEXT, p_required_skills TEXT[],
  p_description TEXT, p_responsibilities TEXT[], p_requirements TEXT[], p_status TEXT
) RETURNS public.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.jobs;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.jobs
  SET title = p_title, company_name = p_company_name, company_logo = p_company_logo,
      location = p_location, job_type = p_job_type, salary_range = p_salary_range,
      required_skills = p_required_skills, description = p_description,
      responsibilities = p_responsibilities, requirements = p_requirements, status = p_status,
      updated_at = NOW()
  WHERE id = p_id
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'job not found'; END IF;
  PERFORM public.fn_audit_log('UPDATE_JOB', 'job', p_id::text,
    jsonb_build_object('title', p_title));
  RETURN v_row;
END; $$;

CREATE OR REPLACE FUNCTION public.fn_admin_delete_job(p_id UUID) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.jobs WHERE id = p_id;
  PERFORM public.fn_audit_log('DELETE_JOB', 'job', p_id::text);
END; $$;

-- 6. User lifecycle
CREATE OR REPLACE FUNCTION public.fn_admin_suspend_user(p_target_id UUID, p_reason TEXT) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles
  SET is_suspended = TRUE, suspended_at = NOW(), suspended_reason = p_reason,
      role_status = 'suspended', updated_at = NOW()
  WHERE id = p_target_id;
  PERFORM public.fn_audit_log('SUSPEND_USER', 'user', p_target_id::text,
    jsonb_build_object('reason', p_reason));
END; $$;

CREATE OR REPLACE FUNCTION public.fn_admin_activate_user(p_target_id UUID) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles
  SET is_suspended = FALSE, suspended_at = NULL, suspended_reason = NULL,
      role_status = 'active', updated_at = NOW()
  WHERE id = p_target_id;
  PERFORM public.fn_audit_log('ACTIVATE_USER', 'user', p_target_id::text);
END; $$;

CREATE OR REPLACE FUNCTION public.fn_admin_set_role(p_target_id UUID, p_role TEXT) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_role NOT IN ('user', 'admin', 'super_admin') THEN RAISE EXCEPTION 'invalid role'; END IF;
  UPDATE public.profiles SET role = p_role, updated_at = NOW() WHERE id = p_target_id;
  PERFORM public.fn_audit_log('SET_ROLE', 'user', p_target_id::text,
    jsonb_build_object('role', p_role));
END; $$;

CREATE OR REPLACE FUNCTION public.fn_admin_set_premium(p_target_id UUID, p_until TIMESTAMPTZ) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles SET premium_until = p_until, updated_at = NOW() WHERE id = p_target_id;
  PERFORM public.fn_audit_log('SET_PREMIUM', 'user', p_target_id::text,
    jsonb_build_object('until', p_until));
END; $$;

-- 7. Universal submission review
CREATE OR REPLACE FUNCTION public.fn_admin_review_universal_submission(
  p_submission_id UUID, p_status TEXT, p_score INT,
  p_strengths TEXT, p_weaknesses TEXT, p_improvement TEXT,
  p_feedback TEXT, p_recommendation TEXT
) RETURNS public.universal_submissions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reviewer_id UUID;
  v_row public.universal_submissions;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_status NOT IN ('Pending Review', 'Passed', 'Failed') THEN RAISE EXCEPTION 'invalid status'; END IF;
  IF p_score < 0 OR p_score > 100 THEN RAISE EXCEPTION 'score must be 0-100'; END IF;
  SELECT id INTO v_reviewer_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  UPDATE public.universal_submissions
  SET status = p_status, score = p_score, strengths = p_strengths, weaknesses = p_weaknesses,
      improvement = p_improvement, feedback = p_feedback, recommendation = p_recommendation,
      evidence_reviewed = TRUE, reviewed_by = v_reviewer_id, reviewed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_submission_id
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'submission not found'; END IF;
  PERFORM public.fn_audit_log('REVIEW_UNIVERSAL_SUBMISSION', 'universal_submission', p_submission_id::text,
    jsonb_build_object('status', p_status, 'score', p_score));
  RETURN v_row;
END; $$;

-- 8. Passport approval / rejection
CREATE OR REPLACE FUNCTION public.fn_admin_approve_skill_passport(
  p_passport_id UUID, p_feedback TEXT, p_digital_signature TEXT
) RETURNS public.skill_passports LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.skill_passports;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.skill_passports
  SET status = 'active', is_verified = TRUE, evidence_strength = 'Verified Expert',
      admin_feedback = p_feedback, digital_signature = p_digital_signature, updated_at = NOW()
  WHERE id = p_passport_id
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'passport not found'; END IF;
  INSERT INTO public.skill_passport_history (passport_id, user_id, skill_id, previous_level, new_level,
    verification_type, reference_id)
  VALUES (v_row.id, v_row.user_id, v_row.skill_id, v_row.current_level, v_row.current_level,
    'admin_approval', v_row.id);
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (v_row.user_id, 'Skill Passport Approved',
          'Your ' || v_row.title || ' Skill Passport has been approved and is now publicly verifiable.',
          'passport_upgrade', '/dashboard/passport');
  PERFORM public.fn_audit_log('APPROVE_SKILL_PASSPORT', 'skill_passport', p_passport_id::text);
  RETURN v_row;
END; $$;

CREATE OR REPLACE FUNCTION public.fn_admin_reject_skill_passport(
  p_passport_id UUID, p_reason TEXT
) RETURNS public.skill_passports LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.skill_passports;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.skill_passports
  SET status = 'archived', is_verified = FALSE, reject_reason = p_reason, updated_at = NOW()
  WHERE id = p_passport_id
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'passport not found'; END IF;
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (v_row.user_id, 'Skill Passport Rejected',
          'Your Skill Passport was rejected. Reason: ' || p_reason, 'warning', '/dashboard/passport');
  PERFORM public.fn_audit_log('REJECT_SKILL_PASSPORT', 'skill_passport', p_passport_id::text,
    jsonb_build_object('reason', p_reason));
  RETURN v_row;
END; $$;

-- 9. Bulk delete (only allowed on whitelisted tables).
CREATE OR REPLACE FUNCTION public.fn_admin_bulk_delete(
  p_table TEXT, p_ids UUID[]
) RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_table NOT IN ('categories', 'sub_categories', 'skills', 'jobs', 'roadmap_templates') THEN
    RAISE EXCEPTION 'table not allowed for bulk delete';
  END IF;
  EXECUTE format('DELETE FROM public.%I WHERE id = ANY($1)', p_table) USING p_ids;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM public.fn_audit_log('BULK_DELETE', p_table, NULL,
    jsonb_build_object('count', v_count, 'ids', p_ids));
  RETURN v_count;
END; $$;

-- 10. Bulk update (only whitelisted tables/columns).
CREATE OR REPLACE FUNCTION public.fn_admin_bulk_update(
  p_table TEXT, p_ids UUID[], p_column TEXT, p_value TEXT
) RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_table NOT IN ('categories', 'sub_categories', 'skills', 'jobs', 'roadmap_templates') THEN
    RAISE EXCEPTION 'table not allowed';
  END IF;
  IF p_column NOT IN ('status', 'display_order', 'difficulty') THEN
    RAISE EXCEPTION 'column not allowed';
  END IF;
  EXECUTE format('UPDATE public.%I SET %I = $1, updated_at = NOW() WHERE id = ANY($2)', p_table, p_column)
    USING p_value, p_ids;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM public.fn_audit_log('BULK_UPDATE', p_table, NULL,
    jsonb_build_object('count', v_count, 'column', p_column, 'value', p_value, 'ids', p_ids));
  RETURN v_count;
END; $$;

COMMIT;
