/**
 * Digital credential / blockchain-ready service.
 *
 * For every approved passport the system mints:
 *   • verification_uuid   — public-safe UUID v4 (used for QR / links)
 *   • verification_hash   — sha256 over stable passport fields
 *   • credential_hash     — sha256(verification_hash + signature)
 *   • hash_timestamp      — ISO timestamp of minting
 *   • verification_token  — unique "SPK-<16 hex>" token (QR / lookup)
 *
 * The `fn_ensure_passport_blockchain` RPC is idempotent — calling it on
 * an already-minted passport is a no-op. The trigger on skill_passports
 * auto-mints when status flips to 'active' + digital_signature set.
 *
 * Public surfaces MUST use the verification_token / public_id / passport_number
 * for lookup. Never expose the internal id (UUID of the row) to employers.
 */
import { supabase } from '../lib/supabase';
import type { SkillPassport } from '../types/database';

/** Mint (or re-fetch) the credential hashes for a passport. */
export async function ensureCredential(passportId: string): Promise<SkillPassport | null> {
  const { data, error } = await supabase.rpc('fn_ensure_passport_blockchain', {
    p_passport_id: passportId,
  });
  if (error) throw error;
  return (data as SkillPassport) ?? null;
}

/** Fetch a passport by its verification_token (used by QR scans). */
export async function getPassportByToken(token: string): Promise<SkillPassport | null> {
  if (!token) return null;
  const { data, error } = await supabase
    .from('skill_passports')
    .select('*')
    .eq('verification_token', token)
    .maybeSingle();
  if (error) throw error;
  return (data as SkillPassport) ?? null;
}

/**
 * Public-safe record. NEVER exposes the internal row id.
 * Employers and social previews use only this shape.
 */
export interface PublicCredential {
  passport_number: string;
  verification_uuid: string;
  verification_token: string;
  verification_hash: string;
  credential_hash: string;
  hash_timestamp: string;
  level: string;
  status: string;
  issue_date: string | null;
  expiry_date: string | null;
  public_id: string;
  qr_code_data: string | null;
}

export function toPublicCredential(p: SkillPassport): PublicCredential | null {
  if (!p.verification_uuid || !p.verification_token) return null;
  return {
    passport_number: p.passport_number,
    verification_uuid: p.verification_uuid,
    verification_token: p.verification_token,
    verification_hash: p.verification_hash ?? '',
    credential_hash: p.credential_hash ?? '',
    hash_timestamp: p.hash_timestamp ?? '',
    level: p.level,
    status: p.status,
    issue_date: p.issue_date,
    expiry_date: p.expiry_date,
    public_id: p.public_id,
    qr_code_data: p.qr_code_data,
  };
}

/**
 * Build a short, employer-friendly verification link.
 * Uses the verification_token when available, otherwise the passport_number.
 * Both forms resolve to the same canonical public passport page.
 */
export function buildCredentialLink(p: SkillPassport): string {
  return `${(typeof window !== 'undefined' ? window.location.origin : '')}/passport/${p.passport_number}`;
}
