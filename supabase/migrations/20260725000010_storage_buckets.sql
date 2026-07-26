-- Migration 10 - Storage buckets for resumes and assessment evidence.

BEGIN;

-- 1. Provision private buckets.
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('assessment-evidence', 'assessment-evidence', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('roadmap-assets', 'roadmap-assets', false)
ON CONFLICT (id) DO NOTHING;

-- 2. resumes: owner can manage; admin can read.
DROP POLICY IF EXISTS "resumes owner read" ON storage.objects;
CREATE POLICY "resumes owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()));

DROP POLICY IF EXISTS "resumes owner insert" ON storage.objects;
CREATE POLICY "resumes owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "resumes owner update" ON storage.objects;
CREATE POLICY "resumes owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "resumes owner delete" ON storage.objects;
CREATE POLICY "resumes owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'resumes' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()));

-- 3. assessment-evidence: owner can read/write; admin can read.
DROP POLICY IF EXISTS "evidence owner read" ON storage.objects;
CREATE POLICY "evidence owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'assessment-evidence' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()));

DROP POLICY IF EXISTS "evidence owner insert" ON storage.objects;
CREATE POLICY "evidence owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assessment-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "evidence owner delete" ON storage.objects;
CREATE POLICY "evidence owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'assessment-evidence' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()));

-- 4. roadmap-assets: public read (thumbnails need to render on the user side);
--    admin-only write.
DROP POLICY IF EXISTS "roadmap-assets public read" ON storage.objects;
CREATE POLICY "roadmap-assets public read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'roadmap-assets');

DROP POLICY IF EXISTS "roadmap-assets admin write" ON storage.objects;
CREATE POLICY "roadmap-assets admin write" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'roadmap-assets' AND public.is_admin())
  WITH CHECK (bucket_id = 'roadmap-assets' AND public.is_admin());

-- 5. avatars bucket 'profiles' stays public-read but ownership for writes.
DROP POLICY IF EXISTS "profiles owner insert" ON storage.objects;
CREATE POLICY "profiles owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "profiles owner update" ON storage.objects;
CREATE POLICY "profiles owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "profiles owner delete" ON storage.objects;
CREATE POLICY "profiles owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'profiles' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()));

COMMIT;
