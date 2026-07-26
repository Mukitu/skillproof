-- Migration 26 - User Management hardening.
--
-- Goals:
--   1. Allow SECURITY DEFINER admin RPCs to succeed when invoked by the
--      service_role (i.e. from the BFF). Without this, is_admin() reads
--      only auth.jwt() -> 'app_metadata' ->> 'role', which is empty for
--      service-role callers, so every fn_admin_* call from the BFF would
--      raise 42501.
--   2. Prevent promotion to super_admin via fn_admin_set_role. Only the
--      designated Super Admin account can be designated super_admin, and
--      that designation happens through bootstrap_super_admin().
--   3. Document the designated Super Admin email invariant.
--   4. Keep audit/RLS unchanged.

BEGIN;

-- ============================================================================
-- 1. is_admin() — accept admin roles + service_role callers.
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
    )
    OR auth.role() = 'service_role';
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role, anon;

-- ============================================================================
-- 2. fn_admin_set_role — refuse to set super_admin via the RPC. Only the
--    designated Super Admin can be promoted, and that path is handled
--    exclusively by bootstrap_super_admin(email).
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_admin_set_role(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.fn_admin_set_role(
  p_target_id UUID, p_role TEXT
) RETURNS public.profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.profiles;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to change role. Your current role is "%".',
      public.fn_current_role() USING ERRCODE = '42501';
  END IF;
  IF p_target_id IS NULL THEN
    RAISE EXCEPTION 'Target user id is required.' USING ERRCODE = '23514';
  END IF;
  IF p_role NOT IN ('user', 'admin') THEN
    RAISE EXCEPTION 'Invalid role "%". Only "user" and "admin" can be assigned through this endpoint.',
      p_role USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_row FROM public.profiles WHERE id = p_target_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found (id: %)', p_target_id USING ERRCODE = 'P0002';
  END IF;
  IF v_row.role = 'super_admin' THEN
    RAISE EXCEPTION 'The Super Admin role cannot be modified through this endpoint.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
     SET role = p_role, updated_at = NOW()
   WHERE id = p_target_id
   RETURNING * INTO v_row;

  PERFORM public.fn_audit_log(
    'SET_ROLE', 'user', p_target_id::TEXT,
    jsonb_build_object('role', p_role)
  );
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_set_role(UUID, TEXT)
  TO authenticated, service_role;

-- ============================================================================
-- 3. fn_admin_set_premium — harden with explicit row lookup and audit context.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_admin_set_premium(UUID, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION public.fn_admin_set_premium(
  p_target_id UUID, p_until TIMESTAMPTZ
) RETURNS public.profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.profiles;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to change premium status. Your current role is "%".',
      public.fn_current_role() USING ERRCODE = '42501';
  END IF;
  IF p_target_id IS NULL THEN
    RAISE EXCEPTION 'Target user id is required.' USING ERRCODE = '23514';
  END IF;

  UPDATE public.profiles
     SET premium_until = p_until, updated_at = NOW()
   WHERE id = p_target_id
   RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found (id: %)', p_target_id USING ERRCODE = 'P0002';
  END IF;

  PERFORM public.fn_audit_log(
    'SET_PREMIUM', 'user', p_target_id::TEXT,
    jsonb_build_object('until', p_until)
  );
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_set_premium(UUID, TIMESTAMPTZ)
  TO authenticated, service_role;

-- ============================================================================
-- 4. fn_admin_suspend_user / fn_admin_activate_user — explicit row lookup
--    + nicer errors.
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_admin_suspend_user(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.fn_admin_suspend_user(
  p_target_id UUID, p_reason TEXT
) RETURNS public.profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.profiles;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to suspend a user. Your current role is "%".',
      public.fn_current_role() USING ERRCODE = '42501';
  END IF;
  IF p_target_id IS NULL THEN
    RAISE EXCEPTION 'Target user id is required.' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_row FROM public.profiles WHERE id = p_target_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found (id: %)', p_target_id USING ERRCODE = 'P0002';
  END IF;
  IF v_row.role = 'super_admin' THEN
    RAISE EXCEPTION 'The Super Admin account cannot be suspended through this endpoint.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
     SET is_suspended = TRUE, suspended_at = NOW(),
         suspended_reason = p_reason, role_status = 'suspended',
         updated_at = NOW()
   WHERE id = p_target_id
   RETURNING * INTO v_row;

  PERFORM public.fn_audit_log(
    'SUSPEND_USER', 'user', p_target_id::TEXT,
    jsonb_build_object('reason', p_reason)
  );
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_suspend_user(UUID, TEXT)
  TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.fn_admin_activate_user(UUID);
CREATE OR REPLACE FUNCTION public.fn_admin_activate_user(
  p_target_id UUID
) RETURNS public.profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.profiles;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required to activate a user. Your current role is "%".',
      public.fn_current_role() USING ERRCODE = '42501';
  END IF;
  IF p_target_id IS NULL THEN
    RAISE EXCEPTION 'Target user id is required.' USING ERRCODE = '23514';
  END IF;

  UPDATE public.profiles
     SET is_suspended = FALSE, suspended_at = NULL,
         suspended_reason = NULL, role_status = 'active',
         updated_at = NOW()
   WHERE id = p_target_id
   RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found (id: %)', p_target_id USING ERRCODE = 'P0002';
  END IF;

  PERFORM public.fn_audit_log('ACTIVATE_USER', 'user', p_target_id::TEXT);
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_admin_activate_user(UUID)
  TO authenticated, service_role;

COMMIT;
