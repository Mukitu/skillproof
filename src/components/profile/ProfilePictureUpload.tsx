
import React, { useCallback, useRef, useState } from 'react';
import {
  Camera,
  Trash2,
  Upload,
  Loader2,
  AlertCircle,
  ImagePlus,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  AVATAR_ALLOWED_MIME,
  AVATAR_MAX_BYTES,
  AvatarError,
  readAvatarUrl,
  removeAvatar,
  replaceAvatar,
} from '../../services/avatar';

type Props = {
  t: (en: string, bn: string) => string;
  onChange?: (newUrl: string | null) => void;
};

function initialsFromName(name: string | null | undefined): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const ProfilePictureUpload: React.FC<Props> = ({ t, onChange }) => {
  const { user, refresh } = useAuth();
  const currentUrl = readAvatarUrl(user);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setError('');
      setBusy(true);
      try {
        const newUrl = await replaceAvatar(file, currentUrl);
        await refresh();
        onChange?.(newUrl);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 3000);
      } catch (e: any) {
        if (e instanceof AvatarError) setError(e.message);
        else setError(e?.message || 'Upload failed.');
      } finally {
        setBusy(false);
      }
    },
    [currentUrl, refresh, onChange],
  );

  const onPick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      
      e.target.value = '';
    },
    [handleFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!busy) setDragOver(true);
  }, [busy]);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const onRemove = useCallback(async () => {
    setError('');
    setBusy(true);
    try {
      await removeAvatar(currentUrl);
      await refresh();
      onChange?.(null);
    } catch (e: any) {
      if (e instanceof AvatarError) setError(e.message);
      else setError(e?.message || 'Could not remove photo.');
    } finally {
      setBusy(false);
    }
  }, [currentUrl, refresh, onChange]);

  const accept = AVATAR_ALLOWED_MIME.join(',');
  const sizeMb = (AVATAR_MAX_BYTES / 1024 / 1024).toFixed(0);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {}
        <div
          ref={dropRef}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`group relative h-28 w-28 shrink-0 overflow-hidden rounded-full ring-2 transition-all ${
            dragOver ? 'ring-[#F97316] scale-[1.03]' : 'ring-slate-200'
          } ${busy ? 'cursor-wait' : 'cursor-pointer'}`}
          onClick={busy ? undefined : onPick}
          role="button"
          tabIndex={0}
          aria-label={t('Change profile picture', 'প্রোফাইল ছবি পরিবর্তন করুন')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onPick();
            }
          }}
        >
          {currentUrl ? (
            <img
              src={currentUrl}
              alt={user?.full_name || 'Profile'}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-3xl font-black text-white">
              {initialsFromName(user?.full_name)}
            </div>
          )}

          {}
          {!busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-6 w-6 text-white" />
            </div>
          )}

          {}
          {dragOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#F97316]/85 text-white">
              <ImagePlus className="h-7 w-7" />
            </div>
          )}

          {}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55">
              <Loader2 className="h-7 w-7 animate-spin text-white" />
            </div>
          )}
        </div>

        {}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={onFileChange}
          disabled={busy}
        />

        {}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-900">
              {t('Profile picture', 'প্রোফাইল ছবি')}
            </h3>
            {justSaved && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                <CheckCircle2 className="h-3 w-3" />
                {t('Updated', 'আপডেট হয়েছে')}
              </span>
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600">
            {t(
              `Drag a photo here or click the avatar. JPG, PNG or WEBP — up to ${sizeMb} MB.`,
              `একটি ছবি টেনে আনুন বা অ্যাভাটারে ক্লিক করুন। JPG, PNG বা WEBP — সর্বোচ্চ ${sizeMb} মেগাবাইট।`,
            )}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={onPick}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-3.5 py-2 text-xs font-black text-white shadow hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload className="h-3.5 w-3.5" />
              {currentUrl
                ? t('Replace photo', 'ছবি পরিবর্তন করুন')
                : t('Upload photo', 'ছবি আপলোড করুন')}
            </button>
            {currentUrl && (
              <button
                type="button"
                onClick={onRemove}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('Remove', 'মুছুন')}
              </button>
            )}
          </div>

          {error && (
            <div className="mt-2 flex items-start gap-1.5 rounded-xl border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePictureUpload;