-- Migration 02 - No-op placeholder.
-- Previously this file seeded 9 hardcoded categories, subcategories, skills, coding challenges, and jobs.
-- The product spec now requires an empty database on fresh installs so admins can fully manage taxonomy.
-- This file is intentionally empty; it is kept in the migration timeline so existing Supabase projects
-- that already applied the original seed migration do not break. New projects get this no-op.
SELECT 1;
