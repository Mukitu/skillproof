const PROD_VERIFICATION_BASE = 'https://skillproof.top';
const PROD_PUBLIC_BASE = 'https://skillproof.top';
const PROD_API_BASE = 'https://skillproof.top/skillproof-api';

function stripTrailingSlash(url: string): string {
  return (url ?? '').replace(/\/+$/, '');
}


export function getVerificationBaseUrl(): string {
  return stripTrailingSlash(PROD_VERIFICATION_BASE);
}


function readEnvBase(): string {
  const env = (import.meta as any)?.env ?? {};
  const candidates = [
    env.VITE_API_URL,
    env.VITE_APP_URL,
    env.NEXT_PUBLIC_APP_URL,
    env.VITE_PUBLIC_URL,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim() && !c.includes('your-project')) {
      return stripTrailingSlash(c.trim());
    }
  }
  return '';
}


export function getPublicBaseUrl(): string {
  const envBase = readEnvBase();
  if (envBase) return envBase;

  // Always use the production public base (https://skillproof.top) for
  // any URL we generate — Passport IDs, QR codes, permanent verification
  // links, share links etc. must resolve to the live domain regardless
  // of whether the local dev server is on 127.0.0.1:5199 or any other
  // port. This guarantees a scanned QR / shared link lands the employer
  // on the actual SkillProof site, not a localhost URL.
  return PROD_PUBLIC_BASE;
}


export function getApiBaseUrl(): string {

  const env = (import.meta as any)?.env ?? {};
  const explicit =
    env.VITE_API_URL ||
    env.VITE_APP_URL ||
    env.NEXT_PUBLIC_APP_URL;
  if (typeof explicit === 'string' && explicit.trim() && !explicit.includes('your-project')) {
    return stripTrailingSlash(explicit.trim());
  }




  return PROD_API_BASE;
}


export function getAppBaseUrl(): string {
  const env = (import.meta as any)?.env ?? {};
  const candidates = [
    env.VITE_API_URL,
    env.VITE_APP_URL,
    env.NEXT_PUBLIC_APP_URL,
    env.VITE_PUBLIC_URL,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim() && !c.includes('your-project')) {
      return stripTrailingSlash(c.trim());
    }
  }


  return getApiBaseUrl();
}


export function isProduction(): boolean {
  try { return Boolean((import.meta as any)?.env?.PROD); } catch { return false; }
}


export function buildVerificationUrl(path: string): string {
  const base = getVerificationBaseUrl();
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}





export function getPublicPassportUrl(passportNumber: string | null | undefined): string {
  // The friendly, single public verification entry point is `/passport`.
  // Every Passport QR code (and every other public link that previously
  // pointed at /passport/<num> or /profile/<id>) now routes here so a
  // scan lands directly on the verification portal with the ID pre-filled.
  // `/passport` then redirects (client + .htaccess) to `/verify?id=…`,
  // which is the canonical route the React Router handles.
  const num = normalizePassportId(passportNumber);
  if (!num) return buildVerificationUrl('/passport');
  return buildVerificationUrl(`/passport?id=${encodeURIComponent(num)}`);
}


/**
 * Public URL for a candidate's stable Profile ID. With the new single
 * /verify portal, the only public link surface is /verify — Profile IDs
 * are still accepted as inputs by the verification portal but no longer
 * generate a separate URL. Kept for internal callers that might still
 * surface the string in share copy.
 */
export function getPublicProfileUrl(publicProfileId: string | null | undefined): string {
  const id = normalizeProfileId(publicProfileId);
  if (!id) return buildVerificationUrl('/verify');
  return buildVerificationUrl(`/verify?id=${encodeURIComponent(id)}`);
}


/**
 * Just the bare Profile ID (canonical short form, no URL). Empty string
 * when the input doesn't look like a Profile ID.
 */
export function getProfileIdShort(publicProfileId: string | null | undefined): string {
  return normalizeProfileId(publicProfileId);
}


export function getEmployerVerificationUrl(): string {
  return buildVerificationUrl('/passport');
}


export function getPassportOgUrl(passportNumber: string): string {
  return getPublicPassportUrl(passportNumber);
}





export function getPublicCertificateUrl(credentialNumber: string | null | undefined): string {
  // The /verify portal is the single public entry point. Certificates no
  // longer have a dedicated public URL — they are surfaced through the
  // candidate's CV when the verifier scans the owning Passport.
  const num = normalizePassportId(credentialNumber);
  if (!num) return buildVerificationUrl('/verify');
  return buildVerificationUrl(`/verify?id=${encodeURIComponent(num)}`);
}


export function getCertificateOgUrl(credentialNumber: string): string {
  return getPublicCertificateUrl(credentialNumber);
}





export function getPassportQrPayload(passportNumber: string | null | undefined): string {
  return getPublicPassportUrl(passportNumber);
}


export function getCertificateQrPayload(credentialNumber: string | null | undefined): string {
  return getPublicCertificateUrl(credentialNumber);
}





export function normalizePassportId(raw: string | null | undefined): string {
  let s = (raw ?? '').trim();
  if (!s) return '';

  s = s.replace(/\s+/g, '');

  s = s.toUpperCase();


  if (
    s.startsWith('SP-BD-') ||
    s.startsWith('SPK-') ||
    s.startsWith('SP-CERT-') ||
    s.startsWith('SPK-CERT-')
  ) {
    return s;
  }




  if (/^SPBD[0-9A-F]{6,}$/.test(s)) {
    return 'SP-BD-' + s.slice(4);
  }

  return s;
}


/**
 * Normalise a stable Profile ID. Server-side format is `SP-BD-XXXXXXXXXX`
 * (10 uppercase hex chars, 17 chars total) — see
 * `public.fn_mint_public_profile_id()` and the back-fill in
 * migration 20260809000009_multi_category_passport.sql.
 *
 * The same Profile ID is shared across every passport + certificate the
 * candidate holds, so a single scan resolves to the full multi-passport
 * CV. The function accepts:
 *   - `SP-BD-9DC13A6DBC`         — canonical short format
 *   - `sp-bd-9dc13a6dbc`         — case-insensitive (normalised to upper)
 *   - `SPBD9DC13A6DBC`           — legacy collapsed form
 *   - `9DC13A6DBC`               — bare 10-char hex (legacy client may omit prefix)
 *
 * Returns the canonical `SP-BD-XXXXXXXXXX` form, or empty string when
 * the input doesn't look like a Profile ID at all.
 */
export function normalizeProfileId(raw: string | null | undefined): string {
  let s = (raw ?? '').trim();
  if (!s) return '';
  s = s.replace(/\s+/g, '');
  s = s.toUpperCase();

  // Strip URL/path prefixes — accept values like "/profile/SP-BD-..." or
  // "https://skillproof.top/profile/SP-BD-...".
  s = s.replace(/^.*\/PROFILE\//i, '');

  // Canonical: SP-BD- + 10 hex
  if (/^SP-BD-[0-9A-F]{10}$/.test(s)) return s;

  // Collapse form: SPBD + 10 hex
  if (/^SPBD[0-9A-F]{10}$/.test(s)) {
    return 'SP-BD-' + s.slice(4);
  }

  // Bare 10-char hex — accept and prefix it.
  if (/^[0-9A-F]{10}$/.test(s)) {
    return 'SP-BD-' + s;
  }

  // Legacy 32-char hex IDs (from the previous migration). Accept so
  // callers pasting an old link still resolve; the DB may have a mix
  // until the migration's backfill completes.
  if (/^[0-9A-F]{32}$/.test(s)) return s.toLowerCase();

  return '';
}


/**
 * Is this string a Profile ID rather than a passport number / certificate
 * credential / verification token?
 *
 * Important: SP-BD- followed by hex could in principle look like a
 * passport_number. We DISAMBIGUATE by:
 *   1. passport_numbers have length >= 6 in the hex tail and use the
 *      `SP-BD-YYYY-XXXXXX` form (year prefix). If the tail is exactly
 *      10 hex chars with NO year segment in the middle, it's a
 *      Profile ID, not a passport_number.
 *   2. Anything matching the 10-char bare hex form is a Profile ID.
 */
export function isProfileId(raw: string | null | undefined): boolean {
  const n = normalizeProfileId(raw);
  if (!n) return false;
  // Canonical SP-BD-XXXXXXXXXX (17 chars, no year segment) = Profile ID
  if (/^SP-BD-[0-9A-F]{10}$/.test(n)) return true;
  // Legacy 32-char hex = Profile ID
  if (/^[0-9A-F]{32}$/.test(n)) return true;
  return false;
}