-- Migration 15 - Expiry helper for stale universal assessments.
-- No pg_cron by default; admin can call fn_expire_pending_assessments() manually or schedule via Supabase cron.

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_expire_pending_assessments() RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.universal_assessments
  SET status = 'Expired'
  WHERE status = 'Pending' AND expires_at < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    PERFORM public.fn_audit_log('EXPIRE_ASSESSMENTS', 'universal_assessment', NULL,
      jsonb_build_object('count', v_count));
  END IF;
  RETURN v_count;
END; $$;

COMMENT ON FUNCTION public.fn_expire_pending_assessments IS
  'Flip Pending assessments older than 72 hours to Expired. Schedule via Supabase pg_cron.';

COMMIT;
