-- Migration 45 - Make skill_passports.skill_id nullable + drop FK to skills.
--
-- Symptom: admin clicks "Save review" on a Universal Assessment submission.
-- Server returns: "Could not review submission: null value in column
--                 "skill_id" of relation "skill_passports" violates
--                 not-null constraint".
--
-- Root cause: migration 42 (enterprise_skill_passport) introduced
-- category-level passports (one per (user, category)). The
-- fn_upsert_passport_eligibility_for function inserts a passport with
-- skill_id = NULL because category-based passports don't have a single
-- skill_id. But migration 0 declared skill_id as NOT NULL with a FK to
-- public.skills(id). The trigger trg_passport_eligibility (also from
-- migration 42) therefore crashes every time a submission becomes Passed.
--
-- Fix:
--   1. Make skill_passports.skill_id NULLABLE.
--   2. Drop the FK to public.skills (category-level passports don't need it).
--   3. Replace the UNIQUE(user_id, skill_id) constraint with a partial
--      unique index that only enforces uniqueness when skill_id IS NOT NULL.
--      This keeps per-skill passports unique but allows many category-level
--      passports per user (one per category).
--   4. Re-affirm that fn_upsert_passport_eligibility_for keeps skill_id NULL.

BEGIN;

-- 1. Make skill_id nullable.
ALTER TABLE public.skill_passports
  ALTER COLUMN skill_id DROP NOT NULL;

-- 2. Drop the FK to public.skills if it exists. Category-level passports do
--    not require a skill.
ALTER TABLE public.skill_passports
  DROP CONSTRAINT IF EXISTS skill_passports_skill_id_fkey;

-- 3. Replace UNIQUE(user_id, skill_id) with a partial index that only
--    enforces uniqueness when skill_id IS NOT NULL. Per-skill passports
--    remain unique; per-category passports do not collide.
ALTER TABLE public.skill_passports
  DROP CONSTRAINT IF EXISTS unique_user_skill_passport;

CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_passports_user_skill_unique
  ON public.skill_passports (user_id, skill_id)
  WHERE skill_id IS NOT NULL;

-- 4. Add a unique partial index for category-level passports so a single
--    user cannot create multiple active passports for the same category.
--    Skip the index if duplicate (user_id, category_id) pairs already exist,
--    so this migration is safe to run on legacy data.
DO $mig45$
DECLARE
  v_dup_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_dup_count
  FROM (
    SELECT user_id, category_id
    FROM public.skill_passports
    WHERE category_id IS NOT NULL
    GROUP BY user_id, category_id
    HAVING COUNT(*) > 1
  ) dups;

  IF v_dup_count = 0 THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_passports_user_category_unique
      ON public.skill_passports (user_id, category_id)
      WHERE category_id IS NOT NULL;
  ELSE
    RAISE NOTICE 'Skipping category uniqueness index: % duplicate (user, category) pairs already exist.', v_dup_count;
  END IF;
END
$mig45$;

COMMIT;