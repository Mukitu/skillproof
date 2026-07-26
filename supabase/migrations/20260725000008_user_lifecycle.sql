-- Migration 08 - User lifecycle columns: suspension, premium, role status.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
  ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS role_status TEXT NOT NULL DEFAULT 'active'
    CHECK (role_status IN ('active', 'suspended', 'deleted'));

CREATE INDEX IF NOT EXISTS idx_profiles_is_suspended ON public.profiles(is_suspended);
CREATE INDEX IF NOT EXISTS idx_profiles_premium_until ON public.profiles(premium_until);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

COMMIT;
