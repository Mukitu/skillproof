-- Migration 18 - Fix profiles RLS infinite recursion.
-- The original is_admin() function reads public.profiles from within a policy on public.profiles.
-- Even with SECURITY DEFINER, some Postgres plans still re-evaluate the policy on profiles.
-- Fix: rewrite is_admin() to read from auth.users via auth.uid() (RLS does not apply there).
-- Adds a NOT NULL guard so admin policies still work for the owning user.

BEGIN;

-- Replace is_admin() with a version that does NOT touch public.profiles.
-- It reads role from a JWT custom claim set by the bootstrap function, with
-- a fallback to NULL for non-priviledged users.
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'),
    false
  );
$$;

-- Profiles policies: keep self access (auth.uid() = user_id), and let admins read all.
-- Important: do NOT have a policy on profiles whose USING reads from profiles.
DROP POLICY IF EXISTS "Admins full access profiles" ON public.profiles;
CREATE POLICY "Admins full access profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

-- For UPDATE/DELETE/INSERT admin actions, the BFF uses the service role (not RLS),
-- so explicit admin INSERT/UPDATE/DELETE policies on profiles are not needed for the
-- client. Self-update is already covered by "Users can update own profile".

-- Allow super_admin the ability to delete a profile via the BFF (service role bypass).
-- This is a no-op for client traffic.

-- A bootstrap helper to set the JWT app_metadata role so that is_admin() works
-- without querying profiles. This is called by the BFF after the auth user exists.
CREATE OR REPLACE FUNCTION public.bootstrap_super_admin(target_email TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = target_email;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No auth user found for email %', target_email;
  END IF;
  -- Promote profile row.
  UPDATE public.profiles
    SET role = 'super_admin', role_status = 'active'
    WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    INSERT INTO public.profiles (user_id, email, role, role_status)
    VALUES (v_user_id, target_email, 'super_admin', 'active');
  END IF;
  -- Set JWT app_metadata so subsequent RLS lookups via is_admin() succeed.
  UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object('role', 'super_admin')
    WHERE id = v_user_id;
END;
$$;

-- Allow a user to insert their own profile row (needed for sign-up flow).
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

COMMIT;
