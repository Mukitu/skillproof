-- Migration 20 - Promote mukituislamnishat@gmail.com to super_admin.
-- Idempotent: re-running this migration is a no-op if already set.
-- Fix: include full_name ('Super Admin') on insert to satisfy NOT NULL constraint.

BEGIN;

DO $$
DECLARE
  v_target_email TEXT := 'mukituislamnishat@gmail.com';
  v_user_id UUID;
  v_auth_user_id UUID;
  v_full_name TEXT := 'Super Admin';
BEGIN
  -- 1. Find or create the auth user (in case they have not signed up yet).
  --    If no auth user exists, we cannot create one here (no password). Instead
  --    we insert a placeholder profile row keyed by a deterministic uuid+user_id
  --    so that when the user eventually signs up the trigger can adopt it.
  SELECT id INTO v_auth_user_id FROM auth.users WHERE email = v_target_email;

  IF v_auth_user_id IS NOT NULL THEN
    v_user_id := v_auth_user_id;
  ELSE
    -- Placeholder: pick a stable UUID for the user_id so that the same row is
    -- matched on subsequent runs. We also keep a placeholder pointer the trigger
    -- can resolve later.
    v_user_id := gen_random_uuid();
  END IF;

  -- 2. Upsert the profile row with full_name.
  INSERT INTO public.profiles (user_id, email, full_name, role, role_status)
  VALUES (v_user_id, v_target_email, v_full_name, 'super_admin', 'active')
  ON CONFLICT (user_id) DO UPDATE
    SET role = 'super_admin',
        role_status = 'active',
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        updated_at = NOW();

  -- 3. Also try to match by email (in case the user signed up but the profile
  --    row was created with a different user_id earlier).
  UPDATE public.profiles
    SET role = 'super_admin',
        role_status = 'active',
        full_name = COALESCE(full_name, v_full_name),
        updated_at = NOW()
    WHERE email = v_target_email
      AND role <> 'super_admin';

  -- 4. Set JWT app_metadata so is_admin() JWT-based check works.
  IF v_auth_user_id IS NOT NULL THEN
    UPDATE auth.users
      SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
          || jsonb_build_object('role', 'super_admin')
      WHERE id = v_auth_user_id;
  END IF;
END $$;

-- Trigger: when this email signs up, auto-promote to super_admin.
CREATE OR REPLACE FUNCTION public.trg_promote_nishat_super_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NEW.email = 'mukituislamnishat@gmail.com' THEN
    NEW.raw_app_meta_data := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', 'super_admin');
    -- Ensure a profile row exists too.
    INSERT INTO public.profiles (user_id, email, full_name, role, role_status)
    VALUES (NEW.id, NEW.email, 'Super Admin', 'super_admin', 'active')
    ON CONFLICT (user_id) DO UPDATE
      SET role = 'super_admin',
          role_status = 'active',
          full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_nishat_super_admin ON auth.users;
CREATE TRIGGER trg_promote_nishat_super_admin
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_promote_nishat_super_admin();

-- Also handle UPDATE of email (rare) so if the user ever changes their email
-- back to this one, they get re-promoted.
CREATE OR REPLACE FUNCTION public.trg_promote_nishat_super_admin_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NEW.email = 'mukituislamnishat@gmail.com' THEN
    NEW.raw_app_meta_data := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', 'super_admin');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_nishat_super_admin_update ON auth.users;
CREATE TRIGGER trg_promote_nishat_super_admin_update
  BEFORE UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_promote_nishat_super_admin_update();

COMMIT;
