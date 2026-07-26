/**
 * Legacy AI service shim. The new pipeline is server-side via BFF (server/routes/ai.ts).
 * These functions keep older pages compilable.
 */
import { getAccessToken } from './auth';
import { APP_URL } from '../lib/supabase';

export async function parseCVTextWithAI(
  cvText: string,
  base64Data: string,
  fileName: string,
  mimeType: string
): Promise<any> {
  const token = await getAccessToken();
  const res = await fetch(`${APP_URL}/api/parse-cv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ cvText, base64Data, fileName, mimeType }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to parse CV');
  }
  const body = await res.json();
  return body.profile ?? body;
}

export function calculateCompleteness(profile: any): number {
  if (!profile) return 0;
  const keys = ['name', 'email', 'phone', 'location', 'bio', 'skills', 'experience', 'education'];
  const filled = keys.filter((k) => {
    const v = profile[k];
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'string') return v.trim().length > 0;
    return !!v;
  }).length;
  return Math.round((filled / keys.length) * 100);
}

export function calculateDynamicProfileCompleteness(_user: any, profile: any): number {
  return calculateCompleteness(profile);
}

export default { parseCVTextWithAI, calculateCompleteness, calculateDynamicProfileCompleteness };
