

import { supabase } from '../lib/supabase';
import { getCurrentUser } from './auth';
import { updateMyProfile } from './auth';
import { logActivity } from './activity';
import type { Profile } from '../types/database';

export const AVATAR_BUCKET = 'avatars';
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024; 
export const AVATAR_MAX_DIMENSION = 512; 

export const AVATAR_ALLOWED_MIME = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;
export type AvatarMime = (typeof AVATAR_ALLOWED_MIME)[number];

export class AvatarError extends Error {
  code:
    | 'not_authenticated'
    | 'invalid_type'
    | 'too_large'
    | 'read_failed'
    | 'encode_failed'
    | 'upload_failed'
    | 'update_failed'
    | 'delete_failed';
  constructor(code: AvatarError['code'], message: string, public cause?: unknown) {
    super(message);
    this.name = 'AvatarError';
    this.code = code;
  }
}

function extFromMime(mime: string): string {
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'bin';
}

function mimeFromExt(ext: string): string {
  const lower = ext.toLowerCase();
  if (lower === 'jpg' || lower === 'jpeg') return 'image/jpeg';
  if (lower === 'png') return 'image/png';
  if (lower === 'webp') return 'image/webp';
  return 'application/octet-stream';
}

function pathFromPublicUrl(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null;
  try {
    
    
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.substring(idx + marker.length));
  } catch {
    return null;
  }
}


function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = src;
  });
}


export async function processAvatarFile(file: File): Promise<{
  blob: Blob;
  mime: AvatarMime;
  ext: string;
  width: number;
  height: number;
}> {
  if (!AVATAR_ALLOWED_MIME.includes(file.type as AvatarMime)) {
    throw new AvatarError(
      'invalid_type',
      'Please upload a JPG, PNG or WEBP image.',
    );
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new AvatarError(
      'too_large',
      `Image is too large (max ${(AVATAR_MAX_BYTES / 1024 / 1024).toFixed(0)} MB).`,
    );
  }

  let bitmap: ImageBitmap | HTMLImageElement;
  const objectUrl = URL.createObjectURL(file);
  try {
    if (typeof createImageBitmap === 'function') {
      try {
        bitmap = await createImageBitmap(file);
      } catch {
        bitmap = await loadImage(objectUrl);
      }
    } else {
      bitmap = await loadImage(objectUrl);
    }
  } catch (e) {
    URL.revokeObjectURL(objectUrl);
    throw new AvatarError('read_failed', 'Could not read this image file.', e);
  }
  URL.revokeObjectURL(objectUrl);

  const srcW = (bitmap as any).width as number;
  const srcH = (bitmap as any).height as number;
  if (!srcW || !srcH) {
    throw new AvatarError('read_failed', 'Image has no dimensions.');
  }

  
  const side = Math.min(srcW, srcH);
  const sx = Math.floor((srcW - side) / 2);
  const sy = Math.floor((srcH - side) / 2);

  const target = Math.min(side, AVATAR_MAX_DIMENSION);
  const canvas = document.createElement('canvas');
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new AvatarError('encode_failed', 'Browser does not support canvas.');
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap as CanvasImageSource, sx, sy, side, side, 0, 0, target, target);

  const outMime: AvatarMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const quality = outMime === 'image/jpeg' ? 0.9 : undefined;
  const blob: Blob | null = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), outMime, quality);
  });
  if (!blob) {
    throw new AvatarError('encode_failed', 'Could not encode image.');
  }
  return {
    blob,
    mime: outMime,
    ext: extFromMime(outMime),
    width: target,
    height: target,
  };
}


export async function uploadAvatar(processed: {
  blob: Blob;
  ext: string;
}): Promise<string> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AvatarError('not_authenticated', 'You are signed out.');
  }
  const path = `${user.id}/avatar-${Date.now()}.${processed.ext}`;

  const { error: upErr } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, processed.blob, {
      cacheControl: '3600',
      upsert: true,
      contentType: mimeFromExt(processed.ext),
    });
  if (upErr) {
    throw new AvatarError('upload_failed', 'Upload failed. Please try again.', upErr);
  }

  const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  try {
    await updateMyProfile({ avatar_url: publicUrl });
  } catch (e) {
    
    
    await supabase.storage.from(AVATAR_BUCKET).remove([path]).catch(() => {});
    throw new AvatarError('update_failed', 'Could not save avatar to your profile.', e);
  }

  void logActivity('avatar.uploaded', 'Updated profile picture', {
    entityType: 'profile',
    metadata: { size: processed.blob.size, mime: processed.ext },
  });

  return publicUrl;
}


export async function removeAvatar(currentUrl: string | null | undefined): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AvatarError('not_authenticated', 'You are signed out.');
  }
  if (currentUrl) {
    const oldPath = pathFromPublicUrl(currentUrl, AVATAR_BUCKET);
    if (oldPath) {
      const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]);
      if (error) {
        throw new AvatarError('delete_failed', 'Could not delete the old avatar.', error);
      }
    }
  }
  try {
    await updateMyProfile({ avatar_url: null });
  } catch (e) {
    throw new AvatarError('update_failed', 'Could not update your profile.', e);
  }
  void logActivity('avatar.removed', 'Removed profile picture', {
    entityType: 'profile',
  });
}


export async function replaceAvatar(
  file: File,
  previousUrl: string | null | undefined,
): Promise<string> {
  const processed = await processAvatarFile(file);
  const newUrl = await uploadAvatar(processed);
  if (previousUrl && previousUrl !== newUrl) {
    
    const oldPath = pathFromPublicUrl(previousUrl, AVATAR_BUCKET);
    if (oldPath) {
      await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]).catch(() => {});
    }
  }
  return newUrl;
}


export function readAvatarUrl(profile: Profile | null | undefined): string | null {
  return profile?.avatar_url ?? null;
}