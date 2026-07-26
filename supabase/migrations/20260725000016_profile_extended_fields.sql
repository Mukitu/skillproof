-- Migration 16 - Extended profile fields for UserProfilePage compatibility.
-- These fields are user-managed via the profile page.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS division TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS profession TEXT,
  ADD COLUMN IF NOT EXISTS current_position TEXT,
  ADD COLUMN IF NOT EXISTS experience_years INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS experience_summary TEXT,
  ADD COLUMN IF NOT EXISTS education_degree TEXT,
  ADD COLUMN IF NOT EXISTS education_institution TEXT,
  ADD COLUMN IF NOT EXISTS education_year TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS resume_url TEXT,
  ADD COLUMN IF NOT EXISTS resume_storage_path TEXT;

COMMIT;
