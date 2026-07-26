-- Migration 13 - Centralised audit log function and trigger.

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_audit_log(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_id UUID;
  v_actor_email TEXT;
  v_id UUID;
BEGIN
  SELECT id, email INTO v_actor_id, v_actor_email
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  INSERT INTO public.audit_logs (actor_id, actor_email, action, entity_type, entity_id, metadata)
  VALUES (v_actor_id, v_actor_email, p_action, p_entity_type, p_entity_id, p_metadata)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.fn_audit_log IS
  'Centralised audit writer. Resolves the calling user from auth.uid() and writes a row.';

COMMIT;
