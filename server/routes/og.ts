/**
 * Server-side Open Graph / link-preview route.
 *
 * LinkedIn / Facebook / X crawlers do not execute JS, so client-side
 * `useDocumentMeta` is invisible to them. This route returns a fully
 * rendered HTML page with the right OG + Twitter card tags so shared
 * links show the correct preview image, title and description.
 *
 * It looks up the passport server-side using the service-role client
 * (no auth required) and only exposes public fields.
 */
import { Router } from 'express';
import { getAdminClient } from '../middleware/auth.js';

const router = Router();

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function getPublicOrigin(): string {
  const raw = stripTrailingSlash(process.env.PUBLIC_URL || '');
  if (!raw || raw.includes('your-project')) {
    return 'https://skillproof.top';
  }
  return raw;
}

function renderOgHtml(opts: {
  title: string;
  description: string;
  url: string;
  image: string | null;
  passportNumber: string;
}): string {
  const siteName = 'SkillProof Bangladesh';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(opts.title)}</title>
    <meta name="description" content="${escapeHtml(opts.description)}" />
    <meta property="og:type" content="profile" />
    <meta property="og:title" content="${escapeHtml(opts.title)}" />
    <meta property="og:description" content="${escapeHtml(opts.description)}" />
    <meta property="og:url" content="${escapeHtml(opts.url)}" />
    <meta property="og:site_name" content="${escapeHtml(siteName)}" />
    ${opts.image ? `<meta property="og:image" content="${escapeHtml(opts.image)}" />` : ''}
    <meta property="profile:username" content="${escapeHtml(opts.passportNumber)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(opts.title)}" />
    <meta name="twitter:description" content="${escapeHtml(opts.description)}" />
    ${opts.image ? `<meta name="twitter:image" content="${escapeHtml(opts.image)}" />` : ''}
    <link rel="canonical" href="${escapeHtml(opts.url)}" />
  </head>
  <body>
    <p>${escapeHtml(opts.title)}</p>
    <p>${escapeHtml(opts.description)}</p>
    <p><a href="${escapeHtml(opts.url)}">Open passport →</a></p>
  </body>
</html>`;
}

/**
 * GET /api/og/passport/:passportNumber
 * Returns server-rendered OG meta for the public passport page.
 */
router.get('/passport/:passportNumber', async (req, res) => {
  const passportNumber = (req.params.passportNumber ?? '').trim();
  if (!passportNumber) {
    return res.status(400).send(renderOgHtml({
      title: 'SkillProof Passport',
      description: 'Verify a SkillProof passport.',
      url: `${getPublicOrigin()}/verify`,
      image: null,
      passportNumber: '',
    }));
  }

  try {
    const admin = getAdminClient();
    const { data: pp } = await admin
      .from('skill_passports')
      .select('passport_number, status, level, main_category_name, user_id, issue_date, expiry_date')
      .eq('passport_number', passportNumber)
      .maybeSingle();
    if (!pp) {
      const origin = getPublicOrigin();
      return res.status(404).send(renderOgHtml({
        title: `Invalid Passport · ${passportNumber} · SkillProof`,
        description: 'No passport matches this ID in the SkillProof database.',
        url: `${origin}/passport/${encodeURIComponent(passportNumber)}`,
        image: null,
        passportNumber,
      }));
    }

    const { data: prof } = await admin
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', (pp as any).user_id)
      .maybeSingle();

    const fullName = (prof as any)?.full_name ?? 'SkillProof Member';
    const avatar = (prof as any)?.avatar_url ?? null;
    const level = (pp as any).level ?? 'Verified';
    const cat = (pp as any).main_category_name ?? 'Verified Skills';
    const origin = getPublicOrigin();
    const publicUrl = `${origin}/passport/${encodeURIComponent((pp as any).passport_number)}`;

    return res.send(renderOgHtml({
      title: `${fullName} · ${level} · ${(pp as any).passport_number}`,
      description: `${fullName} is ${level}-level verified by SkillProof in ${cat}. View the public passport and verification record.`,
      url: publicUrl,
      image: avatar,
      passportNumber: (pp as any).passport_number,
    }));
  } catch (e: any) {
    const origin = getPublicOrigin();
    return res.status(500).send(renderOgHtml({
      title: 'SkillProof Passport',
      description: e?.message ?? 'Failed to render preview.',
      url: `${origin}/verify`,
      image: null,
      passportNumber: passportNumber,
    }));
  }
});

/**
 * GET /api/og/verify
 * Static OG meta for the Employer Verification Portal landing.
 */
router.get('/verify', (_req, res) => {
  const origin = getPublicOrigin();
  return res.send(renderOgHtml({
    title: 'Employer Verification Portal · SkillProof',
    description: 'Verify any Skill Passport by ID or QR code. Real-time lookup against the SkillProof database.',
    url: `${origin}/verify`,
    image: null,
    passportNumber: '',
  }));
});

export default router;