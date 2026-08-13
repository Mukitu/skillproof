
import { supabase } from '../lib/supabase';
import { API_BASE_URL, apiUrl } from '../config/api';
import { normalizePassportId } from '../utils/appUrl';
import type {
  Profile, SkillPassport, PublicCandidateVerification,
  PublicVerificationResponse,
} from '../types/database';

/**
 * Internal helper — unpacks a backend response that may be wrapped in one
 * of these envelopes:
 *
 *   1. The PHP `/api/employer/verify` endpoint returns:
 *        { kind, result, verification: <full sanitised payload> }
 *
 *   2. The direct Supabase RPC `fn_public_candidate_verification_universal`
 *      returns:
 *        { kind, result, data: <full payload> }
 *
 *   3. The RPC may also return the un-enveloped payload directly.
 *
 * In all three cases we want the actual candidate/certificate payload so
 * the React components can render it without branching.
 */
function unwrapVerificationEnvelope(raw: any): any {
  if (!raw || typeof raw !== 'object') return raw;
  if (raw.verification && typeof raw.verification === 'object') {
    return {
      ...raw.verification,
      kind: raw.kind ?? raw.verification.kind ?? 'passport',
      result: raw.result ?? raw.verification.result,
    };
  }
  if (raw.passport && typeof raw.passport === 'object' && !raw.data) {
    return {
      ...raw.passport,
      kind: raw.kind ?? raw.passport.kind ?? 'passport',
      result: raw.result ?? raw.passport.result,
    };
  }
  if (raw.data && typeof raw.data === 'object' && (raw.kind || raw.result)) {
    // Supabase RPC envelope {kind, result, data: {...}}
    return {
      ...raw.data,
      kind: raw.kind ?? raw.data.kind ?? 'passport',
      result: raw.result ?? raw.data.result,
    };
  }
  return raw;
}

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
  
  latestAssessmentScore: number | null;
  
  latestAssessmentAt: string | null;
  
  latestAssessmentTitle: string | null;
  
  passedCount: number;
  
  averageMarks: number;
}


export interface PublicProfile {
  full_name: string;
  avatar_url: string | null;
  current_position: string | null;
  profession: string | null;
  experience_summary: string | null;
  bio: string | null;
  
  district: string | null;
  division: string | null;
  country: string | null;
  
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


export async function getPublicPassportBundle(query: string): Promise<PublicPassportBundle | null> {
  const q = (query ?? '').trim();
  if (!q) return null;

  
  const { data: pp, error: passportErr } = await supabase
    .from('skill_passports')
    .select('*')
    .or(`passport_number.eq.${q},public_id.eq.${q}`)
    .maybeSingle();
  if (passportErr) throw passportErr;
  if (!pp) return null;

  const passport = pp as SkillPassport;

  
  const { data: prof } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', passport.user_id)
    .maybeSingle();
  const profile = toPublicProfile(prof as Profile | null);

  
  const { data: levelData } = await supabase
    .from('passport_level_history')
    .select('id, old_level, new_level, reason, changed_at')
    .eq('passport_id', passport.id)
    .order('changed_at', { ascending: false })
    .limit(20);
  const levelHistory = (levelData as any[]) ?? [];

  
  const { data: renewalData } = await supabase
    .from('passport_renewal_history')
    .select('id, requested_at, decided_at, decision, admin_notes, old_expiry, new_expiry')
    .eq('passport_id', passport.id)
    .order('requested_at', { ascending: false })
    .limit(20);
  const renewalHistory = (renewalData as any[]) ?? [];

  
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
        try { onChange(); } catch {  }
      },
    )
    .subscribe();
  return () => {
    try { supabase.removeChannel(channel); } catch {  }
  };
}


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
        try { onChange(); } catch {  }
      },
    )
    .subscribe();
  return () => {
    try { supabase.removeChannel(channel); } catch {  }
  };
}



export async function getUniversalVerification(
  query: string,
): Promise<PublicVerificationResponse | null> {
  // Back-compat shim — routes through the new unified verifyCandidate().
  return verifyCandidate(query);
}


/**
 * Single public-verification entry point used by the /verify portal.
 *
 * Accepts either a Passport ID (`SP-BD-2026-000001`) OR an email address
 * (`name@example.com`). Auto-detects the shape and dispatches to the
 * correct Supabase RPC / PHP endpoint so the frontend never branches on
 * the kind of input. The response shape is identical in both cases
 * (a `passport`-kind payload enriched with `passports[]` and the candidate
 * profile) so the VerifiedCvProfile component renders the same CV.
 *
 * Returns `null` when the input is empty / unparseable so the caller can
 * show a friendly "enter a Passport ID or email" hint instead of an
 * error toast.
 */
export async function verifyCandidate(
  input: string,
): Promise<PublicVerificationResponse | null> {
  const raw = (input ?? '').trim();
  if (!raw) return null;

  const isEmail = isEmailShaped(raw);
  const normalised = isEmail ? raw.toLowerCase() : normalizePassportId(raw);
  if (!normalised) return null;

  const apiBase = (API_BASE_URL || '').trim();
  const payload = isEmail ? { email: normalised } : { query: normalised };

  if (apiBase) {
    try {
      const res = await fetch(apiUrl('/api/employer/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const rawText = await res.text();
      const isHtml = /^\s*<(!doctype|html|HTML)/i.test(rawText);

      if (!isHtml && res.ok) {
        let data: any = null;
        if (rawText) {
          try { data = JSON.parse(rawText); } catch {  }
        }
        const unwrapped = unwrapVerificationEnvelope(data) as
          | PublicVerificationResponse
          | null;
        if (unwrapped) return unwrapped;
      } else if (res.status === 429) {
        // Rate-limited — surface as a not_found to the UI rather than
        // spamming the Supabase RPC.
        return { kind: 'not_found', result: 'not_found' } as PublicVerificationResponse;
      } else {
        console.warn(
          '[publicPassport] /api/employer/verify returned non-OK; falling back to direct Supabase.',
          { status: res.status, isHtml },
        );
      }
    } catch (err) {
      console.warn('[publicPassport] /api/employer/verify fetch failed; falling back.', err);
    }
  }

  // Direct Supabase fallback. Pick the right RPC based on input shape.
  const { data, error } = isEmail
    ? await supabase.rpc('fn_public_candidate_verification_by_email', { p_email: normalised })
    : await supabase.rpc('fn_public_candidate_verification_universal', { p_query: normalised });
  if (error) throw error;
  if (!data) return null;
  return unwrapVerificationEnvelope(data) as PublicVerificationResponse;
}


/**
 * Loose email-shape detection used to decide which RPC to dispatch.
 * Keeps the SkillProof ID prefixes (SP-BD-… etc.) on the Passport path
 * even if they happen to contain an '@' character.
 */
function isEmailShaped(raw: string): boolean {
  const s = (raw ?? '').trim();
  if (!s || s.length > 320) return false;
  const upper = s.toUpperCase();
  if (
    upper.startsWith('SP-BD-')
    || upper.startsWith('SPK-')
    || upper.startsWith('SP-CERT-')
    || upper.startsWith('SPK-CERT-')
    || upper.startsWith('SPBD')
  ) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}


/**
 * Fetch all category passports for a public profile (without login).
 * Returns an empty array if the profile has no public passports or has
 * disabled public_employer_view.
 */
export async function listUserPublicPassports(
  profileId: string,
): Promise<any[]> {
  const q = (profileId ?? '').trim();
  if (!q) return [];
  const { data, error } = await supabase.rpc('fn_list_user_passports_public', {
    p_profile_id: q,
  });
  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return data as any[];
}


export function subscribeToPublicCandidateVerification(
  passportNumber: string,
  onChange: () => void,
): () => void {
  const channel = supabase
    .channel(`public-candidate-verification:${passportNumber}`)
    .on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'public',
        table: 'skill_passports',
        filter: `passport_number=eq.${passportNumber}`,
      },
      () => {
        try { onChange(); } catch {  }
      },
    )
    .subscribe();
  return () => {
    try { supabase.removeChannel(channel); } catch {  }
  };
}


export function subscribeToPublicCertificateVerification(
  credentialNumber: string,
  onChange: () => void,
): () => void {
  const channel = supabase
    .channel(`public-cert-verify:${credentialNumber}`)
    .on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'public',
        table: 'course_certificates',
        filter: `credential_number=eq.${credentialNumber}`,
      },
      () => {
        try { onChange(); } catch {  }
      },
    )
    .subscribe();
  return () => {
    try { supabase.removeChannel(channel); } catch {  }
  };
}
