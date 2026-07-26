-- Migration 21 - Audit log enhanced schema.
-- Adds old_value / new_value JSONB, ip INET, user_agent TEXT, browser TEXT.
-- Updates fn_audit_log RPC signature to accept new parameters (backward compatible).
-- Idempotent: safe to re-run.

BEGIN;

-- ============================================================================
-- 1. Add new columns (idempotent via IF NOT EXISTS).
-- ============================================================================
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS old_value JSONB,
  ADD COLUMN IF NOT EXISTS new_value JSONB,
  ADD COLUMN IF NOT EXISTS ip INET,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS browser TEXT;

-- ============================================================================
-- 2. Indexes for the new query patterns (filters in AdminAuditLogsPage).
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created
  ON public.audit_logs (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_entity_id
  ON public.audit_logs (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_ip
  ON public.audit_logs (ip)
  WHERE ip IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_email
  ON public.audit_logs (actor_email)
  WHERE actor_email IS NOT NULL;

-- ============================================================================
-- 3. Update fn_audit_log RPC.
--    Backward compatible: old parameters stay; new ones optional.
--    Now accepts old_value, new_value, ip, user_agent.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_audit_log(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_ip INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_browser TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_actor_id UUID;
  v_actor_email TEXT;
  v_id UUID;
BEGIN
  -- Resolve actor from auth.uid() → profiles.user_id.
  SELECT p.id, p.email
    INTO v_actor_id, v_actor_email
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
    LIMIT 1;

  INSERT INTO public.audit_logs (
    actor_id, actor_email, action, entity_type, entity_id,
    metadata, old_value, new_value, ip, user_agent, browser
  )
  VALUES (
    v_actor_id, v_actor_email, p_action, p_entity_type, p_entity_id,
    p_metadata, p_old_value, p_new_value, p_ip, p_user_agent, p_browser
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_audit_log(
  TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, INET, TEXT, TEXT
) TO authenticated, service_role;

-- ============================================================================
-- 4. Helper: derive browser name from user_agent string (used by RPC fallback).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_parse_browser(p_user_agent TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_user_agent IS NULL OR p_user_agent = '' THEN
    RETURN 'Unknown';
  END IF;
  IF p_user_agent ~* 'Edg/' THEN
    RETURN 'Edge';
  ELSIF p_user_agent ~* 'OPR/|Opera' THEN
    RETURN 'Opera';
  ELSIF p_user_agent ~* 'Firefox/' THEN
    RETURN 'Firefox';
  ELSIF p_user_agent ~* 'Chrome/' THEN
    RETURN 'Chrome';
  ELSIF p_user_agent ~* 'Safari/' THEN
    RETURN 'Safari';
  ELSIF p_user_agent ~* 'curl|wget|httpie|postman|insomnia' THEN
    RETURN 'CLI';
  ELSE
    RETURN 'Other';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_parse_browser(TEXT) TO authenticated, service_role;

-- ============================================================================
-- 5. Backfill browser column for existing rows that have a user_agent.
-- ============================================================================
UPDATE public.audit_logs
  SET browser = public.fn_parse_browser(user_agent)
  WHERE user_agent IS NOT NULL
    AND (browser IS NULL OR browser = '');

COMMIT;
