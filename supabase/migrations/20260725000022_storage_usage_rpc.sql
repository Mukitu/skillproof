-- Migration 22 - Storage usage RPC.
-- Returns total bytes across our managed buckets (resumes, assessment-evidence, profiles, roadmap-assets).
-- SECURITY DEFINER so it can read storage.objects.
-- Idempotent.
--
-- storage.objects columns (as exposed by the supabase_storage schema):
--   id, bucket_id, name, owner, metadata, created_at, updated_at,
--   last_accessed_at, version, path_tokens
-- Object size lives in metadata->>'size' (BIGINT cast from text).
-- If metadata.size is missing, we treat it as 0.

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_storage_total_bytes()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT COALESCE(SUM(COALESCE((obj.metadata ->> 'size')::bigint, 0)), 0)::bigint
    FROM storage.objects obj
    WHERE obj.bucket_id IN ('resumes', 'assessment-evidence', 'profiles', 'roadmap-assets');
$$;

GRANT EXECUTE ON FUNCTION public.fn_storage_total_bytes() TO authenticated, service_role;

-- Per-bucket breakdown for the dashboard / admin tools.
CREATE OR REPLACE FUNCTION public.fn_storage_per_bucket()
RETURNS TABLE (bucket TEXT, bytes BIGINT, object_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT obj.bucket_id::TEXT AS bucket,
         COALESCE(SUM(COALESCE((obj.metadata ->> 'size')::bigint, 0)), 0)::bigint AS bytes,
         COUNT(*)::bigint AS object_count
    FROM storage.objects obj
    WHERE obj.bucket_id IN ('resumes', 'assessment-evidence', 'profiles', 'roadmap-assets')
    GROUP BY obj.bucket_id
    ORDER BY obj.bucket_id;
$$;

GRANT EXECUTE ON FUNCTION public.fn_storage_per_bucket() TO authenticated, service_role;

COMMIT;