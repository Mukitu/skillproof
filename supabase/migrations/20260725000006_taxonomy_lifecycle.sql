-- Migration 06 - Lifecycle, display order, and difficulty for taxonomy.

BEGIN;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active', 'Archived', 'Draft')),
  ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.sub_categories
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active', 'Archived', 'Draft')),
  ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active', 'Archived', 'Draft')),
  ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'Medium'
    CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_categories_order ON public.categories(display_order);
CREATE INDEX IF NOT EXISTS idx_sub_categories_order ON public.sub_categories(display_order);
CREATE INDEX IF NOT EXISTS idx_skills_order ON public.skills(display_order);

COMMIT;
