-- Migration 19 - Unique submission per assessment and trigger fix.

BEGIN;

-- Prevent duplicate submissions for the same assessment.
CREATE UNIQUE INDEX IF NOT EXISTS uq_universal_submission_assessment
  ON public.universal_submissions(assessment_id);

-- Rewrite the trigger function so it works for both INSERT and UPDATE
-- without referring to OLD on INSERT (which is invalid).
CREATE OR REPLACE FUNCTION public.trg_passport_after_submission()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  passed_count INT;
  v_skill_id UUID;
  v_user_id UUID;
  v_skill_name TEXT;
  v_existing_passport UUID;
  v_passport_number TEXT;
  v_public_id TEXT;
BEGIN
  -- Only act when the new state is 'Passed'.
  IF NEW.status <> 'Passed' THEN
    RETURN NEW;
  END IF;

  -- For UPDATE, only fire if the status actually transitioned.
  IF TG_OP = 'UPDATE' AND OLD.status = 'Passed' THEN
    RETURN NEW;
  END IF;

  v_user_id := NEW.user_id;
  SELECT ua.skill_id INTO v_skill_id
  FROM public.universal_assessments ua
  WHERE ua.id = NEW.assessment_id;
  IF v_skill_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT s.name INTO v_skill_name FROM public.skills s WHERE s.id = v_skill_id;

  SELECT COUNT(DISTINCT us.id) INTO passed_count
  FROM public.universal_submissions us
  JOIN public.universal_assessments ua ON ua.id = us.assessment_id
  WHERE us.user_id = v_user_id
    AND ua.skill_id = v_skill_id
    AND us.status = 'Passed';

  IF passed_count >= 5 THEN
    SELECT id INTO v_existing_passport
    FROM public.skill_passports
    WHERE user_id = v_user_id AND skill_id = v_skill_id
    LIMIT 1;

    IF v_existing_passport IS NULL THEN
      v_passport_number := 'SP-BD-' || upper(substring(replace(gen_random_uuid()::text, '-', '') for 10));
      v_public_id := encode(gen_random_bytes(16), 'hex');

      INSERT INTO public.skill_passports (
        passport_number, user_id, skill_id, current_level, verification_score,
        evidence_strength, integrity_score, verification_count, public_id,
        status, title, is_verified, qr_code_data
      ) VALUES (
        v_passport_number, v_user_id, v_skill_id, 3, NEW.score,
        'Strong', 100, passed_count, v_public_id,
        'pending_approval', COALESCE(v_skill_name, '') || ' Verified Expert', false,
        'https://skillproof.top/passport/' || v_passport_number
      );

      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        v_user_id,
        'Passport Pending Approval',
        'You have completed 5 distinct ' || COALESCE(v_skill_name, 'skill') || ' assessments. Your Skill Passport is pending admin verification.',
        'passport_upgrade',
        '/dashboard/passport'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_passport_after_submission ON public.universal_submissions;
CREATE TRIGGER trg_passport_after_submission
  AFTER UPDATE OF status ON public.universal_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_passport_after_submission();

DROP TRIGGER IF EXISTS trg_passport_after_submission_insert ON public.universal_submissions;
CREATE TRIGGER trg_passport_after_submission_insert
  AFTER INSERT ON public.universal_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_passport_after_submission();

COMMIT;
