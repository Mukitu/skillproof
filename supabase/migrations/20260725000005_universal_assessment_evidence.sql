-- Migration 05 - Universal Assessment evidence (multi-link + multi-file) and active-assessment lock.

BEGIN;

-- 1. Evidence table: links and files attached to a single submission.
CREATE TABLE IF NOT EXISTS public.universal_assessment_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.universal_submissions(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('link', 'file')),
  -- For 'link': one of the supported link labels.
  -- For 'file': 'file'.
  label TEXT NOT NULL,
  url TEXT,                -- populated for 'link'
  storage_path TEXT,       -- populated for 'file' (path in 'assessment-evidence' bucket)
  bucket TEXT,             -- bucket name (default 'assessment-evidence')
  mime_type TEXT,
  size_bytes BIGINT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_u_evidence_submission
  ON public.universal_assessment_evidence(submission_id);

ALTER TABLE public.universal_assessment_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own evidence" ON public.universal_assessment_evidence;
CREATE POLICY "Users can view own evidence" ON public.universal_assessment_evidence
  FOR SELECT USING (
    submission_id IN (
      SELECT s.id FROM public.universal_submissions s
      JOIN public.profiles p ON p.id = s.user_id
      WHERE p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own evidence" ON public.universal_assessment_evidence;
CREATE POLICY "Users can insert own evidence" ON public.universal_assessment_evidence
  FOR INSERT WITH CHECK (
    submission_id IN (
      SELECT s.id FROM public.universal_submissions s
      JOIN public.profiles p ON p.id = s.user_id
      WHERE p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own evidence" ON public.universal_assessment_evidence;
CREATE POLICY "Users can delete own evidence" ON public.universal_assessment_evidence
  FOR DELETE USING (
    submission_id IN (
      SELECT s.id FROM public.universal_submissions s
      JOIN public.profiles p ON p.id = s.user_id
      WHERE p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins full access evidence" ON public.universal_assessment_evidence;
CREATE POLICY "Admins full access evidence" ON public.universal_assessment_evidence
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- 2. Add lifecycle columns to universal_assessments.
ALTER TABLE public.universal_assessments
  ADD COLUMN IF NOT EXISTS skill_name TEXT,
  ADD COLUMN IF NOT EXISTS category_name TEXT,
  ADD COLUMN IF NOT EXISTS sub_category_name TEXT,
  ADD COLUMN IF NOT EXISTS experience_level TEXT,
  ADD COLUMN IF NOT EXISTS additional_info TEXT,
  ADD COLUMN IF NOT EXISTS mandatory_description TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Submitted', 'Expired', 'Cancelled')),
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours');

-- Backfill denormalised names so existing rows don't read NULL.
UPDATE public.universal_assessments ua
SET skill_name = s.name
FROM public.skills s
WHERE s.id = ua.skill_id AND ua.skill_name IS NULL;

-- 3. Partial unique index: one active assessment per (user, skill).
CREATE UNIQUE INDEX IF NOT EXISTS uq_universal_active_user_skill
  ON public.universal_assessments(user_id, skill_id)
  WHERE status = 'Pending';

CREATE INDEX IF NOT EXISTS idx_u_assessments_user_skill_status
  ON public.universal_assessments(user_id, skill_id, status);

CREATE INDEX IF NOT EXISTS idx_u_assessments_expires
  ON public.universal_assessments(expires_at)
  WHERE status = 'Pending';

-- 4. Add recommendation column to submissions.
ALTER TABLE public.universal_submissions
  ADD COLUMN IF NOT EXISTS recommendation TEXT,
  ADD COLUMN IF NOT EXISTS evidence_reviewed BOOLEAN DEFAULT FALSE;

-- 5. Replace existing universal_assessments policies with status-aware versions.
DROP POLICY IF EXISTS "Users can view their own assessments" ON public.universal_assessments;
CREATE POLICY "Users can view their own assessments" ON public.universal_assessments
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert their own assessments" ON public.universal_assessments;
CREATE POLICY "Users can insert their own assessments" ON public.universal_assessments
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own pending assessments" ON public.universal_assessments;
CREATE POLICY "Users can update their own pending assessments" ON public.universal_assessments
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND status = 'Pending'
  );

DROP POLICY IF EXISTS "Admins full access assessments" ON public.universal_assessments;
CREATE POLICY "Admins full access assessments" ON public.universal_assessments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

COMMIT;
