
import { supabase } from '../lib/supabase';
import { apiUrl } from '../config/api';
import { getAccessToken, getCurrentUser } from './auth';
import { logActivity } from './activity';
import type { Profile } from '../types/database';

let cachedProfileId: string | null = null;


export async function getProfileByProfileId(profileId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}


export async function getMyProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles').select('*').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  if (data) cachedProfileId = (data as Profile).id;
  return (data as Profile) ?? null;
}


export async function getMyProfileId(): Promise<string | null> {
  if (cachedProfileId) return cachedProfileId;
  const profile = await getMyProfile();
  return profile?.id ?? null;
}


/**
 * Get the signed-in user's stable public Profile ID (the 32-char hex
 * string used as the canonical deep-link into the public verified CV).
 * Falls back to fetching fresh if the cache is cold. Returns null when
 * the user is not signed in.
 */
export async function getMyPublicProfileId(): Promise<string | null> {
  const profile = await getMyProfile();
  const id = (profile as any)?.public_profile_id ?? null;
  if (typeof id === 'string' && id.trim()) return id.trim();
  return null;
}

export async function updateProfile(patch: Partial<Profile>): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('profiles').update(patch).eq('user_id', user.id).select('*').single();
  if (error) throw error;
  const row = data as Profile;
  const changed = Object.keys(patch);
  void logActivity('profile.updated', `Updated profile fields: ${changed.join(', ')}`, {
    entityType: 'profile',
    entityId: row.id,
    metadata: { fields: changed },
  });
  return row;
}

export async function uploadAvatar(file: File): Promise<string> {
  // SECURITY HARDENING (Phase 1): the legacy `profiles`-bucket avatar
  // uploader is unsafe (no MIME / extension / size validation, and the
  // server-side `profiles` bucket policies historically lacked a
  // per-user prefix check). New callers MUST use the canvas-encoded
  // avatar pipeline in `services/avatar.ts`, which uploads to the
  // dedicated `avatars` bucket with MIME + size enforcement.
  // This shim now forwards to the safer `avatar.ts` uploader so any
  // existing call-site continues to work without re-introducing the
  // server-side hole. New callers should import `uploadAvatar` directly
  // from `services/avatar.ts`.
  try {
    if (typeof console !== 'undefined') {
      console.warn(
        '[security] services/profile.ts:uploadAvatar is deprecated; use services/avatar.ts instead.'
      );
    }
  } catch {}
  const { processAvatarFile, uploadAvatar: safeUploadAvatar } = await import('./avatar');
  const processed = await processAvatarFile(file);
  return safeUploadAvatar(processed);
}

export async function uploadResume(file: File): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  const token = await getAccessToken();
  void logActivity('resume.uploaded', `Uploaded resume (${(file.size / 1024).toFixed(1)} KB)`, {
    metadata: { file_name: file.name, size: file.size },
  });
  if (!token) throw new Error('Not authenticated');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  let res: Response;
  try {
    res = await fetch(apiUrl('/api/storage/resume/sign-upload'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fileName: safeName, mime: file.type || 'application/octet-stream', size: file.size }),
    });
  } catch (err: any) {
    
    
    const isNet = err instanceof TypeError || /Failed to fetch|NetworkError/i.test(String(err?.message));
    if (isNet) {
      const e: any = new Error(
        'AI service is temporarily unreachable. The backend did not respond. ' +
        'Please try again in a minute. If this persists, the server is being restarted.'
      );
      e.code = 'BACKEND_UNREACHABLE';
      e.cause = err;
      throw e;
    }
    throw err;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to obtain upload URL');
  }
  const { path, signedUrl, token: uploadToken } = await res.json();
  const upload = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream', Authorization: `Bearer ${uploadToken}` },
    body: file,
  });
  if (!upload.ok) throw new Error('Upload failed');
  return path;
}
