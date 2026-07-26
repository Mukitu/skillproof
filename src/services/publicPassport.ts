/**
 * Public passport service — single source of truth for everything an
 * unauthenticated visitor or an employer sees.
 *
 * The service handles:
 *  1. Public passport lookup by passport_number OR public_id.
 *  2. Profile lookup for the public views (PII-safe).
 *  3. Verification history (level/renewal) for the public timeline.
 *  4. The latest assessment score (NEW) so the public page can show it.
 *  5. Realtime subscription so the public page updates the second an
 *     admin approves / rejects / renews / suspends.
 *
 * NEVER expose: email, phone, address, dob, resume_url, documents.
 */
import { supabase } from '../lib/supabase';
import type { Profile, SkillPassport } from '../types/database';

export interface PublicPassportBundle {
  passport: SkillPassport;
  profile: PublicProfile;
  levelHistory: Array<{
    id: string;
    old_level: string;
    new_level: string;
    reason: string | null;
    changed_at: string;
  }>;
  renewalHistory: Array<{
    id: string;
    requested_at: string;
    decided_at: string | null;
    decision: string | null;
    admin_notes: string | null;
    old_expiry: string | null;
    new_expiry: string | null;
  }>;
  /** Latest verified assessment score (0..10) for the category, if any. */
  latestAssessmentScore: number | null;
  /** Latest assessment timestamp. */
  latestAssessmentAt: string | null;
  /** Latest assessment title (for the public timeline). */
  latestAssessmentTitle: string | null;
  /** Number of passed skill verifications in the main category. */
  passedCount: number;
  /** Average score in the main category (0..10). */
  averageMarks: number;
}

/**
 * PII-safe projection of a profile. Always strips email, phone, address,
 * resume, dob and any other sensitive fields.
 */
export interface PublicProfile {
  full_name: string;
  avatar_url: string | null;
  current_position: string | null;
  profession: string | null;
  experience_summary: string | null;
  bio: string | null;
  /** District/division/country are kept at high level only — no street address. */
  district: string | null;
  division: string | null;
  country: string | null;
  /** Highest-level public professional links. */
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  website_url: string | null;
}

function toPublicProfile(p: Profile | null | undefined): PublicProfile {
  if (!p) {
    return {
      full_name: 'SkillProof Member',
      avatar_url: null,
      current_position: null,
      profession: null,
      experience_summary: null,
      bio: null,
      district: null,
      division: null,
      country: 'Bangladesh',
      linkedin_url: null,
      github_url: null,
      portfolio_url: null,
      website_url: null,
    };
  }
  return {
    full_name: p.full_name ?? 'SkillProof Member',
    avatar_url: p.avatar_url ?? null,
    current_position: p.current_position ?? null,
    profession: p.profession ?? null,
    experience_summary: p.experience_summary ?? null,
    bio: p.bio ?? null,
    district: p.district ?? null,
    division: p.division ?? null,
    country: p.country ?? 'Bangladesh',
    linkedin_url: p.linkedin_url ?? null,
    github_url: p.github_url ?? null,
    portfolio_url: p.portfolio_url ?? null,
    website_url: p.website_url ?? null,
  };
}

/**
 * Public lookup by passport_number OR public_id. Returns the passport +
 * profile + timeline + score in a single round-trip.
 */
export async function getPublicPassportBundle(query: string): Promise<PublicPassportBundle | null> {
  const q = (query ?? '').trim();
  if (!q) return null;

  // Step 1: find the passport.
  const { data: pp, error: passportErr } = await supabase
    .from('skill_passports')
    .select('*')
    .or(`passport_number.eq.${q},public_id.eq.${q}`)
    .maybeSingle();
  if (passportErr) throw passportErr;
  if (!pp) return null;

  const passport = pp as SkillPassport;

  // Step 2: profile (PII-safe).
  const { data: prof } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', passport.user_id)
    .maybeSingle();
  const profile = toPublicProfile(prof as Profile | null);

  // Step 3: level history (newest first).
  const { data: levelData } = await supabase
    .from('passport_level_history')
    .select('id, old_level, new_level, reason, changed_at')
    .eq('passport_id', passport.id)
    .order('changed_at', { ascending: false })
    .limit(20);
  const levelHistory = (levelData as any[]) ?? [];

  // Step 4: renewal history.
  const { data: renewalData } = await supabase
    .from('passport_renewal_history')
    .select('id, requested_at, decided_at, decision, admin_notes, old_expiry, new_expiry')
    .eq('passport_id', passport.id)
    .order('requested_at', { ascending: false })
    .limit(20);
  const renewalHistory = (renewalData as any[]) ?? [];

  // Step 5: latest assessment (Passed) score in this passport's category.
  let latestAssessmentScore: number | null = null;
  let latestAssessmentAt: string | null = null;
  let latestAssessmentTitle: string | null = null;
  try {
    const { data: latest } = await supabase
      .from('skill_verification_submissions')
      .select('id, score, updated_at, reviewed_at, task_id, status')
      .eq('user_id', passport.user_id)
      .eq('status', 'Passed')
      .order('reviewed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest) {
      latestAssessmentScore = latest.score ?? null;
      latestAssessmentAt = latest.reviewed_at ?? latest.updated_at ?? null;
      // Fetch the task title separately (denormalising avoided).
      if (latest.task_id) {
        const { data: task } = await supabase
          .from('skill_verification_tasks')
          .select('title')
          .eq('id', latest.task_id)
          .maybeSingle();
        latestAssessmentTitle = (task as any)?.title ?? null;
      }
    }
  } catch {
    // ignore — latest score is optional enrichment.
  }

  return {
    passport,
    profile,
    levelHistory: levelHistory.map((row) => ({
      id: row.id,
      old_level: row.old_level,
      new_level: row.new_level,
      reason: row.reason ?? null,
      changed_at: row.changed_at,
    })),
    renewalHistory: renewalHistory.map((row) => ({
      id: row.id,
      requested_at: row.requested_at,
      decided_at: row.decided_at ?? null,
      decision: row.decision ?? null,
      admin_notes: row.admin_notes ?? null,
      old_expiry: row.old_expiry ?? null,
      new_expiry: row.new_expiry ?? null,
    })),
    latestAssessmentScore,
    latestAssessmentAt,
    latestAssessmentTitle,
    passedCount: passport.passed_count ?? 0,
    averageMarks: Number(passport.average_marks ?? 0),
  };
}

/**
 * Subscribe to realtime changes for a single passport by passport_number.
 * Calls onChange whenever the row is updated (INSERT/UPDATE/DELETE).
 */
export function subscribeToPublicPassport(
  passportNumber: string,
  onChange: () => void,
): () => void {
  const channel = supabase
    .channel(`public-passport:${passportNumber}`)
    .on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'public',
        table: 'skill_passports',
        filter: `passport_number=eq.${passportNumber}`,
      },
      () => {
        try { onChange(); } catch { /* noop */ }
      },
    )
    .subscribe();
  return () => {
    try { supabase.removeChannel(channel); } catch { /* noop */ }
  };
}

/**
 * Generic realtime subscription keyed by user_id (when the public page
 * wants to refetch on any passport change for the owning user).
 */
export function subscribeToUserPassports(
  userId: string,
  onChange: () => void,
): () => void {
  const channel = supabase
    .channel(`public-user-passports:${userId}`)
    .on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'public',
        table: 'skill_passports',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        try { onChange(); } catch { /* noop */ }
      },
    )
    .subscribe();
  return () => {
    try { supabase.removeChannel(channel); } catch { /* noop */ }
  };
}
