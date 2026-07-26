-- Migration 17 - AI career profile jsonb column on profiles.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_career_profile JSONB;

COMMIT;
