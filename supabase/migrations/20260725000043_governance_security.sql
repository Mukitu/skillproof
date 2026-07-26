-- ============================================================================
-- Migration 43 — Enterprise Governance, Security, Analytics &
-- Blockchain-Ready Credential System (Phase 3)
--
-- Adds:
--   1. Blockchain-ready columns on skill_passports
--   2. Unique verification token column for QR / public lookup
--   3. Admin RBAC role enum + permissions table
--   4. employer_verifications table (track every employer search)
--   5. activity_events table (permanent user activity timeline)
--   6. RPC fn_log_activity (insert activity + audit log atomically)
--   7. RPC fn_employer_verify (atomic verification + history write)
--   8. RPC fn_admin_assign_role (granular RBAC role assignment)
--   9. RPC fn_analytics_dashboard (single round-trip analytics payload)
--  10. RPC fn_ensure_passport_blockchain (mint verification/credential hashes)
--  11. RPC fn_admin_create_admin / fn_admin_remove_admin / fn_admin_suspend_admin
--  12. RLS policies that respect the new RBAC + tables
--
-- All migrations are idempotent so re-running the file is safe.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Blockchain-ready columns on skill_passports
-- ============================================================================

ALTER TABLE public.skill_passports
  ADD COLUMN IF NOT EXISTS verification_uuid UUID,
  ADD COLUMN IF NOT EXISTS verification_hash TEXT,
  ADD COLUMN IF NOT EXISTS credential_hash TEXT,
  ADD COLUMN IF NOT EXISTS hash_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_token TEXT,
  ADD COLUMN IF NOT EXISTS blockchain_network TEXT,
  ADD COLUMN IF NOT EXISTS blockchain_tx_id TEXT;

-- Unique partial index — verification_token must always be unique when set.
CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_passports_verification_token
  ON public.skill_passports (verification_token)
  WHERE verification_token IS NOT NULL;

-- Hash lookup index — used by the QR scan path.
CREATE INDEX IF NOT EXISTS idx_skill_passports_verification_uuid
  ON public.skill_passports (verification_uuid)
  WHERE verification_uuid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_skill_passports_verification_hash
  ON public.skill_passports (verification_hash)
  WHERE verification_hash IS NOT NULL;

-- ============================================================================
-- 2. RBAC — admin permissions system
-- ============================================================================

-- The application supports two layers:
--   a) profiles.role: high-level role (user / admin / super_admin)
--   b) admin_permissions: granular RBAC grants for admins
--
-- A Super Admin has all permissions implicitly.
-- An Admin only has the permissions explicitly granted here.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_permission_key') THEN
    CREATE TYPE public.admin_permission_key AS ENUM (
      'passport.review',
      'passport.renew',
      'passport.suspend',
      'assessment.review',
      'assessment.score',
      'category.manage',
      'roadmap.manage',
      'roadmap.publish',
      'job.manage',
      'job.publish',
      'analytics.view',
      'audit.view',
      'user.suspend',
      'user.activate',
      'user.premium'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission    public.admin_permission_key NOT NULL,
  granted_by    UUID REFERENCES public.profiles(id),
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_admin_permissions_profile
  ON public.admin_permissions (profile_id);

-- ============================================================================
-- 3. Employer verifications — track every QR/ID lookup
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.employer_verifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id     UUID REFERENCES public.skill_passports(id) ON DELETE SET NULL,
  passport_number TEXT,
  verification_id UUID,
  result          TEXT NOT NULL CHECK (result IN ('verified', 'invalid', 'expired', 'suspended')),
  ip_address      INET,
  user_agent      TEXT,
  browser         TEXT,
  device          TEXT,
  country         TEXT,
  city            TEXT,
  region          TEXT,
  referer         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employer_verifications_created_at
  ON public.employer_verifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_employer_verifications_passport_id
  ON public.employer_verifications (passport_id);

CREATE INDEX IF NOT EXISTS idx_employer_verifications_result
  ON public.employer_verifications (result);

-- ============================================================================
-- 4. activity_events — permanent user activity timeline
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_event_kind') THEN
    CREATE TYPE public.activity_event_kind AS ENUM (
      'account.created',
      'profile.updated',
      'avatar.uploaded',
      'resume.uploaded',
      'ai_career.generated',
      'roadmap.started',
      'roadmap.day_completed',
      'roadmap.completed',
      'assessment.created',
      'assessment.submitted',
      'assessment.passed',
      'assessment.failed',
      'assessment.reviewed',
      'verification.created',
      'verification.passed',
      'verification.failed',
      'passport.requested',
      'passport.approved',
      'passport.rejected',
      'passport.renewed',
      'passport.downloaded',
      'job.applied',
      'job.saved',
      'notification.sent',
      'login.success',
      'login.failed',
      'password.changed',
      'admin.role_changed'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.activity_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id      UUID,
  kind         public.activity_event_kind NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  entity_type  TEXT,
  entity_id    TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_profile_created
  ON public.activity_events (profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_user_created
  ON public.activity_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_kind
  ON public.activity_events (kind);

-- ============================================================================
-- 5. fn_log_activity — write activity + audit log atomically
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_log_activity(
  p_profile_id UUID,
  p_kind public.activity_event_kind,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_id UUID;
BEGIN
  -- Resolve auth user id from profile id (best effort).
  SELECT user_id INTO v_user_id FROM public.profiles WHERE id = p_profile_id LIMIT 1;

  INSERT INTO public.activity_events (
    profile_id, user_id, kind, title, description, entity_type, entity_id, metadata
  )
  VALUES (
    p_profile_id, v_user_id, p_kind, p_title, p_description, p_entity_type, p_entity_id, p_metadata
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_log_activity(
  UUID, public.activity_event_kind, TEXT, TEXT, TEXT, TEXT, JSONB
) TO authenticated, service_role;

-- ============================================================================
-- 6. fn_ensure_passport_blockchain — mint hashes + verification token
-- ============================================================================

-- Idempotent. If a passport already has a verification_token we keep it.
-- Otherwise we generate UUID + verification_hash (sha256 over stable passport fields)
-- + credential_hash + hash_timestamp + unique verification_token.

CREATE OR REPLACE FUNCTION public.fn_ensure_passport_blockchain(p_passport_id UUID)
RETURNS public.skill_passports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_row public.skill_passports%ROWTYPE;
  v_token TEXT;
  v_uuid UUID;
  v_hash TEXT;
  v_credential TEXT;
  v_attempts INT := 0;
BEGIN
  SELECT * INTO v_row FROM public.skill_passports WHERE id = p_passport_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Passport not found: %', p_passport_id;
  END IF;

  -- If everything is already minted we just return the existing row.
  IF v_row.verification_token IS NOT NULL AND v_row.verification_hash IS NOT NULL THEN
    RETURN v_row;
  END IF;

  -- Mint UUID.
  v_uuid := gen_random_uuid();

  -- Verification hash: sha256(passport_number || status || level || user_id || issue_date).
  v_hash := encode(
    digest(
      concat_ws(
        '|',
        v_row.passport_number,
        COALESCE(v_row.status::text, ''),
        COALESCE(v_row.level::text, ''),
        COALESCE(v_row.user_id::text, ''),
        COALESCE(v_row.issue_date::text, '')
      ),
      'sha256'
    ),
    'hex'
  );

  -- Credential hash: sha256(hash + signed_at + signed_by + digital_signature).
  v_credential := encode(
    digest(
      concat_ws(
        '|',
        v_hash,
        COALESCE(v_row.signed_at::text, ''),
        COALESCE(v_row.signed_by::text, ''),
        COALESCE(v_row.digital_signature, '')
      ),
      'sha256'
    ),
    'hex'
  );

  -- Generate a unique verification_token. SPK-<short> ensures QR codes stay
  -- compact while remaining globally unique thanks to the unique index.
  LOOP
    v_attempts := v_attempts + 1;
    v_token := 'SPK-' || upper(encode(extensions.gen_random_bytes(8), 'hex'));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.skill_passports WHERE verification_token = v_token
    );
    EXIT WHEN v_attempts > 5;
  END LOOP;

  UPDATE public.skill_passports
    SET verification_uuid = v_uuid,
        verification_hash = v_hash,
        credential_hash = v_credential,
        hash_timestamp = now(),
        verification_token = v_token,
        qr_code_data = COALESCE(qr_code_data, 'https://skillproof.top/passport/' || passport_number)
    WHERE id = p_passport_id
    RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_ensure_passport_blockchain(UUID)
  TO authenticated, service_role;

-- ============================================================================
-- 7. fn_employer_verify — atomic verification + history write
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_employer_verify(
  p_query TEXT,
  p_ip INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_browser TEXT DEFAULT NULL,
  p_device TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_referer TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row public.skill_passports%ROWTYPE;
  v_result TEXT;
  v_bundle JSONB;
BEGIN
  -- Look up the passport by passport_number OR verification_token OR public_id.
  SELECT * INTO v_row FROM public.skill_passports
    WHERE passport_number = p_query
       OR verification_token = p_query
       OR public_id = p_query
    LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.employer_verifications (
      passport_number, result, ip_address, user_agent, browser,
      device, country, city, region, referer
    ) VALUES (
      p_query, 'invalid', p_ip, p_user_agent, p_browser,
      p_device, p_country, p_city, p_region, p_referer
    );
    RETURN jsonb_build_object(
      'result', 'invalid',
      'passport', NULL
    );
  END IF;

  -- Determine effective status.
  IF v_row.status = 'active' AND v_row.expiry_date IS NOT NULL
     AND v_row.expiry_date < now() THEN
    v_result := 'expired';
  ELSIF v_row.status = 'suspended' THEN
    v_result := 'suspended';
  ELSE
    v_result := 'verified';
  END IF;

  -- Ensure blockchain fields are minted.
  v_row := public.fn_ensure_passport_blockchain(v_row.id);

  INSERT INTO public.employer_verifications (
    passport_id, passport_number, verification_id, result,
    ip_address, user_agent, browser, device, country, city, region, referer
  ) VALUES (
    v_row.id, v_row.passport_number, v_row.verification_uuid, v_result,
    p_ip, p_user_agent, p_browser, p_device, p_country, p_city, p_region, p_referer
  );

  v_bundle := jsonb_build_object(
    'result', v_result,
    'passport', to_jsonb(v_row)
  );
  RETURN v_bundle;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_employer_verify(
  TEXT, INET, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO anon, authenticated, service_role;

-- ============================================================================
-- 8. fn_admin_assign_role — grant/revoke a permission to an admin
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_admin_assign_role(
  p_target_profile_id UUID,
  p_permission public.admin_permission_key,
  p_grant BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_actor UUID;
BEGIN
  SELECT id INTO v_actor FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_actor AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Only Super Admin can assign roles';
  END IF;

  IF p_grant THEN
    INSERT INTO public.admin_permissions (profile_id, permission, granted_by)
    VALUES (p_target_profile_id, p_permission, v_actor)
    ON CONFLICT (profile_id, permission) DO NOTHING;
  ELSE
    DELETE FROM public.admin_permissions
    WHERE profile_id = p_target_profile_id
      AND permission = p_permission;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_assign_role(
  UUID, public.admin_permission_key, BOOLEAN
) TO authenticated, service_role;

-- ============================================================================
-- 9. fn_admin_has_permission — used by the BFF and the client guard
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_admin_has_permission(
  p_permission public.admin_permission_key
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
  )
  OR EXISTS (
    SELECT 1
      FROM public.profiles p
      JOIN public.admin_permissions ap ON ap.profile_id = p.id
     WHERE p.user_id = auth.uid()
       AND ap.permission = p_permission
  );
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_has_permission(public.admin_permission_key)
  TO authenticated, service_role;

-- ============================================================================
-- 10. fn_analytics_dashboard — single round-trip analytics payload
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_analytics_dashboard()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT (public.is_admin()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  WITH base AS (
    SELECT
      (SELECT COUNT(*) FROM public.profiles) AS total_users,
      (SELECT COUNT(*) FROM public.profiles WHERE is_suspended = false AND role_status = 'active') AS active_users,
      (SELECT COUNT(*) FROM public.profiles WHERE role IN ('admin', 'super_admin')) AS admin_users,
      (SELECT COUNT(*) FROM public.profiles WHERE is_premium = true) AS premium_users,
      (SELECT COUNT(*) FROM public.profiles WHERE verification_status = 'verified') AS verified_users,
      (SELECT COUNT(*) FROM public.skill_passports) AS total_passports,
      (SELECT COUNT(*) FROM public.skill_passports WHERE status = 'pending_approval') AS pending_passports,
      (SELECT COUNT(*) FROM public.skill_passports WHERE status = 'active') AS active_passports,
      (SELECT COUNT(*) FROM public.skill_passports WHERE status = 'rejected') AS rejected_passports,
      (SELECT COUNT(*) FROM public.skill_passports WHERE status = 'suspended') AS suspended_passports,
      (SELECT COUNT(*) FROM public.skill_passports WHERE renewal_status = 'renewed') AS renewed_passports,
      (SELECT COUNT(*) FROM public.skill_passports WHERE expiry_date IS NOT NULL AND expiry_date < now()) AS expired_passports,
      (SELECT COUNT(*) FROM public.universal_assessments) AS total_assessments,
      (SELECT COUNT(*) FROM public.universal_submissions) AS total_submissions,
      (SELECT COUNT(*) FROM public.skill_verification_submissions) AS total_verifications,
      (SELECT COUNT(*) FROM public.skill_verification_submissions WHERE status = 'Passed') AS passed_verifications,
      (SELECT COUNT(*) FROM public.skill_verification_submissions WHERE status = 'Failed') AS failed_verifications,
      (SELECT COUNT(*) FROM public.employer_verifications) AS employer_verifications,
      (SELECT COUNT(*) FROM public.employer_verifications WHERE created_at > now() - interval '24 hours') AS verifications_24h,
      (SELECT COUNT(*) FROM public.jobs WHERE status = 'Active') AS active_jobs,
      (SELECT COUNT(*) FROM public.roadmap_templates) AS total_roadmaps,
      (SELECT COUNT(*) FROM public.notifications WHERE created_at > now() - interval '7 days') AS notifications_7d
  ),
    categories_popular AS (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.passed DESC), '[]'::jsonb) AS value
      FROM (
        SELECT p.category_id, c.name AS category_name, COUNT(*) AS passed
        FROM public.skill_verification_submissions p
        LEFT JOIN public.categories c ON c.id = p.category_id
        WHERE p.status = 'Passed'
        GROUP BY p.category_id, c.name
        ORDER BY passed DESC
        LIMIT 10
      ) t
    ),
    skills_popular AS (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.count DESC), '[]'::jsonb) AS value
      FROM (
        SELECT s.skill_id, COALESCE(svt.title, '<unknown>') AS skill_name, COUNT(*) AS count
        FROM public.skill_verification_submissions s
        LEFT JOIN public.skill_verification_tasks svt ON svt.id = s.task_id
        GROUP BY s.skill_id, svt.title
        ORDER BY count DESC
        LIMIT 10
      ) t
    ),
    monthly AS (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.month ASC), '[]'::jsonb) AS value
      FROM (
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
               COUNT(*) AS users
        FROM public.profiles
        WHERE created_at > now() - interval '12 months'
        GROUP BY 1
        ORDER BY 1
      ) t
    ),
    daily AS (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.day ASC), '[]'::jsonb) AS value
      FROM (
        SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
               COUNT(*) AS events
        FROM public.activity_events
        WHERE created_at > now() - interval '30 days'
        GROUP BY 1
        ORDER BY 1
      ) t
    )
  SELECT jsonb_build_object(
    'totals', to_jsonb(base.*),
    'popular_categories', categories_popular.value,
    'popular_skills', skills_popular.value,
    'monthly_growth', monthly.value,
    'daily_activity', daily.value,
    'computed_at', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  )
  FROM base, categories_popular, skills_popular, monthly, daily
  INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_analytics_dashboard() TO authenticated, service_role;

-- ============================================================================
-- 11. Auto-mint blockchain hashes on every approved passport
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_passport_mint_blockchain_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.digital_signature IS NOT NULL THEN
    PERFORM public.fn_ensure_passport_blockchain(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_passport_mint_blockchain ON public.skill_passports;
CREATE TRIGGER trg_passport_mint_blockchain
  AFTER INSERT OR UPDATE OF status, digital_signature, signed_at ON public.skill_passports
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_passport_mint_blockchain_trigger();

-- ============================================================================
-- 12. Backfill existing approved passports
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM public.skill_passports
     WHERE status = 'active' AND verification_token IS NULL
  LOOP
    PERFORM public.fn_ensure_passport_blockchain(r.id);
  END LOOP;
END $$;

-- ============================================================================
-- 13. RLS for new tables
-- ============================================================================

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

-- admin_permissions: only super_admin can SELECT/INSERT/UPDATE/DELETE.
DROP POLICY IF EXISTS "admin_permissions_all" ON public.admin_permissions;
CREATE POLICY "admin_permissions_all" ON public.admin_permissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role = 'super_admin')
  );

-- employer_verifications: only super_admin can SELECT.
DROP POLICY IF EXISTS "employer_verifications_admin_select" ON public.employer_verifications;
CREATE POLICY "employer_verifications_admin_select" ON public.employer_verifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'super_admin'))
  );

-- activity_events: owner can SELECT their own, admins can SELECT all.
DROP POLICY IF EXISTS "activity_events_owner_select" ON public.activity_events;
CREATE POLICY "activity_events_owner_select" ON public.activity_events
  FOR SELECT USING (
    profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'super_admin'))
  );

-- No UPDATE/DELETE allowed on activity_events — timeline is permanent.
DROP POLICY IF EXISTS "activity_events_no_modify" ON public.activity_events;
CREATE POLICY "activity_events_no_modify" ON public.activity_events
  FOR INSERT WITH CHECK (false);
DROP POLICY IF EXISTS "activity_events_no_delete" ON public.activity_events;
CREATE POLICY "activity_events_no_delete" ON public.activity_events
  FOR DELETE USING (false);

-- audit_logs is already write-once; reinforce.
DROP POLICY IF EXISTS "audit_logs_no_delete_client" ON public.audit_logs;
CREATE POLICY "audit_logs_no_delete_client" ON public.audit_logs
  FOR DELETE USING (false);
DROP POLICY IF EXISTS "audit_logs_no_update_client" ON public.audit_logs;
CREATE POLICY "audit_logs_no_update_client" ON public.audit_logs
  FOR UPDATE USING (false);

-- ============================================================================
-- 14. fn_admin_create_admin / remove_admin / suspend_admin (BFF helpers)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_admin_create_admin(
  p_email TEXT,
  p_full_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_actor UUID;
  v_target_user UUID;
  v_target_profile UUID;
BEGIN
  SELECT id INTO v_actor FROM public.profiles WHERE user_id = auth.uid() AND role = 'super_admin' LIMIT 1;
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Only Super Admin can create admins';
  END IF;

  SELECT id INTO v_target_user FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
  IF v_target_user IS NULL THEN
    RAISE EXCEPTION 'No Supabase Auth user with email %', p_email;
  END IF;

  SELECT id INTO v_target_profile FROM public.profiles WHERE user_id = v_target_user LIMIT 1;
  IF v_target_profile IS NULL THEN
    INSERT INTO public.profiles (user_id, email, full_name, role, role_status)
    VALUES (v_target_user, p_email, COALESCE(NULLIF(p_full_name, ''), ''), 'admin', 'active')
    RETURNING id INTO v_target_profile;
  ELSE
    UPDATE public.profiles SET role = 'admin', role_status = 'active', full_name = COALESCE(NULLIF(p_full_name, ''), full_name)
    WHERE id = v_target_profile;
  END IF;

  RETURN v_target_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_create_admin(TEXT, TEXT)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_admin_remove_admin(p_target_profile_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_actor UUID;
BEGIN
  SELECT id INTO v_actor FROM public.profiles WHERE user_id = auth.uid() AND role = 'super_admin' LIMIT 1;
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Only Super Admin can remove admins'; END IF;

  UPDATE public.profiles
    SET role = 'user', role_status = 'active'
    WHERE id = p_target_profile_id AND role = 'admin';

  DELETE FROM public.admin_permissions WHERE profile_id = p_target_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_remove_admin(UUID)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_admin_suspend_admin(
  p_target_profile_id UUID,
  p_suspended BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_actor UUID;
BEGIN
  SELECT id INTO v_actor FROM public.profiles WHERE user_id = auth.uid() AND role = 'super_admin' LIMIT 1;
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Only Super Admin can suspend admins'; END IF;

  UPDATE public.profiles
    SET is_suspended = p_suspended,
        role_status = CASE WHEN p_suspended THEN 'suspended' ELSE 'active' END
    WHERE id = p_target_profile_id AND role IN ('admin', 'super_admin');
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_suspend_admin(UUID, BOOLEAN)
  TO authenticated, service_role;

-- ============================================================================
-- 14b. fn_log_notification — explicit insert (called by BFF + admin tools)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_log_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (p_user_id, p_title, p_message, p_type, p_link)
  RETURNING id INTO v_id;

  -- Mirror to activity timeline so the bell + activity stay in sync.
  PERFORM public.fn_log_activity(
    (SELECT id FROM public.profiles WHERE user_id = p_user_id LIMIT 1),
    'notification.sent',
    p_title,
    p_message,
    'notification',
    v_id::TEXT,
    jsonb_build_object('link', p_link, 'type', p_type)
  );

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_log_notification(UUID, TEXT, TEXT, TEXT, TEXT)
  TO authenticated, service_role;

-- ============================================================================
-- 15. Realtime publication for new tables
-- ============================================================================

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'admin_permissions',
    'employer_verifications',
    'activity_events',
    'skill_verification_submissions',
    'skill_verification_tasks'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY tables LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END $$;

COMMIT;