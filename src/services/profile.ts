/**
 * Profile service — read/update profile, resume upload.
 */
import { supabase } from '../lib/supabase';
import { APP_URL } from '../lib/supabase';
import { getAccessToken, getCurrentUser } from './auth';
import { logActivity } from './activity';
import type { Profile } from '../types/database';

let cachedProfileId: string | null = null;

/**
 * Get the profile row by profiles.id (the row PK, not the auth user id).
 * Used by the public verification page where we only know the owner
 * profile id and need name + avatar.
 */
export async function getProfileByProfileId(profileId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

/**
 * Get the profile row for the current authenticated user.
 * Returns null if not signed in.
 */
export async function getMyProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles').select('*').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  if (data) cachedProfileId = (data as Profile).id;
  return (data as Profile) ?? null;
}

/**
 * Resolve the current profile row id (profiles.id).
 * Cached for the session.
 * Returns null if not signed in / profile missing.
 */
export async function getMyProfileId(): Promise<string | null> {
  if (cachedProfileId) return cachedProfileId;
  const profile = await getMyProfile();
  return profile?.id ?? null;
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
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  const ext = file.name.split('.').pop() || 'png';
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('profiles').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('profiles').getPublicUrl(path);
  return data.publicUrl;
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
  const res = await fetch(`${APP_URL}/api/storage/resume/sign-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fileName: safeName, mime: file.type || 'application/octet-stream', size: file.size }),
  });
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
