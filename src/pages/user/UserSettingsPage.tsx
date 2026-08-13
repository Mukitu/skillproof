import { useEffect, useState } from 'react';
import { Save, CheckCircle2, AlertCircle, Languages, Bell, ShieldCheck, Phone, BadgeCheck, Sparkles, Link as LinkIcon, Activity, MapPin, Calendar, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateMyProfile } from '../../services/auth';
import { PublicVisibilitySection } from '../../components/passport/PublicVisibilitySection';

export const UserSettingsPage = () => {
  const { user, refresh } = useAuth();
  const [language, setLanguage] = useState(user?.language || 'bn');
  const [notifications, setNotifications] = useState(user?.notification_settings || { email: true, job_alerts: true, verification_updates: true });
  const [privacy, setPrivacy] = useState(user?.privacy_settings || { public_profile: true, show_phone: true });
  const [showPhoneOnVerified, setShowPhoneOnVerified] = useState<boolean>(false);
  const [hideAiOnVerified, setHideAiOnVerified] = useState<boolean>(false);
  const [hideEvidenceOnVerified, setHideEvidenceOnVerified] = useState<boolean>(false);
  const [hideTimelineOnVerified, setHideTimelineOnVerified] = useState<boolean>(false);
  const [showGenderOnVerified, setShowGenderOnVerified] = useState<boolean>(false);
  const [showDobOnVerified, setShowDobOnVerified] = useState<boolean>(false);
  const [showAddressOnVerified, setShowAddressOnVerified] = useState<boolean>(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifiedProfileSaved, setVerifiedProfileSaved] = useState(false);
  const [verifiedProfileSaving, setVerifiedProfileSaving] = useState(false);
  const [error, setError] = useState('');
  const [verifiedError, setVerifiedError] = useState('');

  useEffect(() => {
    if (user) {
      setLanguage(user.language || 'bn');
      setNotifications(user.notification_settings || { email: true, job_alerts: true, verification_updates: true });
      setPrivacy(user.privacy_settings || { public_profile: true, show_phone: true });
      // Default to false so a missing field never exposes the phone.
      setShowPhoneOnVerified(user.show_phone_on_verified_profile === true);
      // Per-section hide toggles default to false (i.e. visible by default).
      setHideAiOnVerified((user as any)?.hide_ai_on_verified_profile === true);
      setHideEvidenceOnVerified((user as any)?.hide_evidence_on_verified_profile === true);
      setHideTimelineOnVerified((user as any)?.hide_timeline_on_verified_profile === true);
      setShowGenderOnVerified((user as any)?.show_gender_on_verified_profile === true);
      setShowDobOnVerified((user as any)?.show_dob_on_verified_profile === true);
      setShowAddressOnVerified((user as any)?.show_address_on_verified_profile === true);
    }
  }, [user]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await updateMyProfile({ language: language as any, notification_settings: notifications, privacy_settings: privacy });
      await refresh();
      setSaved(true);
      setError('');
      setTimeout(() => setSaved(false), 2200);
    } catch (e: any) {
      // QA-USER-TEST-006: surface save failures instead of swallowing
      setError(e?.message || 'Could not save settings. Please try again.');
      setTimeout(() => setError(''), 3500);
    } finally {
      setSaving(false);
    }
  };

  const saveVerifiedProfilePrivacy = async () => {
    setVerifiedProfileSaving(true);
    setVerifiedError('');
    try {
      await updateMyProfile({
        show_phone_on_verified_profile: showPhoneOnVerified,
        hide_ai_on_verified_profile: hideAiOnVerified,
        hide_evidence_on_verified_profile: hideEvidenceOnVerified,
        hide_timeline_on_verified_profile: hideTimelineOnVerified,
        show_gender_on_verified_profile: showGenderOnVerified,
        show_dob_on_verified_profile: showDobOnVerified,
        show_address_on_verified_profile: showAddressOnVerified,
      } as any);
      await refresh();
      setVerifiedProfileSaved(true);
      setVerifiedError('');
      setTimeout(() => setVerifiedProfileSaved(false), 2200);
    } catch (e: any) {
      // QA-USER-TEST-006
      setVerifiedError(e?.message || 'Could not save verified profile settings. Please try again.');
      setTimeout(() => setVerifiedError(''), 3500);
    } finally {
      setVerifiedProfileSaving(false);
    }
  };

  const verifiedShareUrl = (() => {
    const passport = (user as any)?.passport_number || (user as any)?.verification_token || null;
    if (!passport) return null;
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${encodeURIComponent(passport)}`;
  })();

  return (
    <div className="space-y-6">
      {}
      <div className="relative overflow-hidden rounded-brand-lg border border-brand-border bg-white px-5 sm:px-6 py-5 shadow-brand-sm">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1"
          style={{
            background:
              'linear-gradient(90deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)',
          }}
        />
        <div className="pt-1">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 border border-red-100 text-[11px] font-bold uppercase tracking-wider text-[#E31B23]">
            <ShieldCheck className="w-3 h-3" /> Account
          </span>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl break-words">Account Settings</h1>
          <p className="mt-1 text-sm text-slate-500 break-words">Manage language, notifications and privacy preferences.</p>
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 size={16} /> Settings saved successfully.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {verifiedError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">
          <AlertCircle size={16} className="shrink-0" /> {verifiedError}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
          <Languages className="w-4 h-4 text-[#E31B23]" /> Language
        </h2>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'bn' | 'en')}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm sm:w-auto focus:border-[#E31B23] focus:outline-none focus:ring-2 focus:ring-red-100"
        >
          <option value="bn">বাংলা (Bengali)</option>
          <option value="en">English</option>
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
          <Bell className="w-4 h-4 text-[#E31B23]" /> Notifications
        </h2>
        <div className="space-y-2.5">
          {([
            { k: 'email', label: 'Email notifications' },
            { k: 'job_alerts', label: 'Job alerts' },
            { k: 'verification_updates', label: 'Verification result updates' },
          ]).map((row) => (
            <label key={row.k} className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={!!(notifications as any)[row.k]}
                onChange={(e) => setNotifications({ ...notifications, [row.k]: e.target.checked })}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#E31B23] focus:ring-[#E31B23]"
              />
              <span className="break-words">{row.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
          <ShieldCheck className="w-4 h-4 text-[#E31B23]" /> Privacy
        </h2>
        <div className="space-y-2.5">
          <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={!!privacy.public_profile}
              onChange={(e) => setPrivacy({ ...privacy, public_profile: e.target.checked })}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#E31B23] focus:ring-[#E31B23]"
            />
            <span className="break-words">Make my SkillProof profile public</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={!!privacy.show_phone}
              onChange={(e) => setPrivacy({ ...privacy, show_phone: e.target.checked })}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#E31B23] focus:ring-[#E31B23]"
            />
            <span className="break-words">Show phone number on profile</span>
          </label>
        </div>
      </div>

      {/*
        Verified Profile privacy section.
        This is the dedicated toggle for the public /verify/SP-XXXX profile.
        Default OFF. Persisted via updateMyProfile() → profiles.show_phone_on_verified_profile.
      */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-slate-900">
          <BadgeCheck className="w-4 h-4 text-[#E31B23]" /> Verified Profile
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          Control what recruiters and employers see when they look up your SkillProof Verified
          Profile at <span className="font-mono">/verify/&lt;your-verification-number&gt;</span>.
        </p>

        {verifiedProfileSaved ? (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            <CheckCircle2 size={16} /> Verified profile privacy updated.
          </div>
        ) : null}

        <div className="space-y-2.5">
          <label className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showPhoneOnVerified}
              onChange={(e) => setShowPhoneOnVerified(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-[#E31B23] focus:ring-[#E31B23]"
            />
            <span className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-slate-500 mt-0.5" />
              <span>
                <span className="block text-sm font-bold text-slate-900 break-words">
                  Show my phone number on my SkillProof Verified Profile
                </span>
                <span className="block text-[11px] text-slate-500 break-words">
                  Enable this only if you want recruiters/employers to contact you directly
                  through your verified profile. Off by default.
                </span>
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hideAiOnVerified}
              onChange={(e) => setHideAiOnVerified(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-[#E31B23] focus:ring-[#E31B23]"
            />
            <span className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-slate-500 mt-0.5" />
              <span>
                <span className="block text-sm font-bold text-slate-900 break-words">
                  Hide AI Career Profile from my verified profile
                </span>
                <span className="block text-[11px] text-slate-500 break-words">
                  Turn ON to hide the AI-generated Career Profile section (scores, strengths,
                  recommended skills, summary) from recruiters. Visible by default.
                </span>
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hideEvidenceOnVerified}
              onChange={(e) => setHideEvidenceOnVerified(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-[#E31B23] focus:ring-[#E31B23]"
            />
            <span className="flex items-start gap-2">
              <LinkIcon className="h-4 w-4 text-slate-500 mt-0.5" />
              <span>
                <span className="block text-sm font-bold text-slate-900 break-words">
                  Hide Public Evidence links from my verified profile
                </span>
                <span className="block text-[11px] text-slate-500 break-words">
                  Turn ON to hide your GitHub, portfolio and other public evidence links
                  from recruiters. Visible by default.
                </span>
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hideTimelineOnVerified}
              onChange={(e) => setHideTimelineOnVerified(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-[#E31B23] focus:ring-[#E31B23]"
            />
            <span className="flex items-start gap-2">
              <Activity className="h-4 w-4 text-slate-500 mt-0.5" />
              <span>
                <span className="block text-sm font-bold text-slate-900 break-words">
                  Hide Career Activity Timeline from my verified profile
                </span>
                <span className="block text-[11px] text-slate-500 break-words">
                  Turn ON to hide the chronological Career Activity Timeline (assessment
                  results, certificate issuances, roadmap completions) from recruiters.
                  Visible by default.
                </span>
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showGenderOnVerified}
              onChange={(e) => setShowGenderOnVerified(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-[#E31B23] focus:ring-[#E31B23]"
            />
            <span className="flex items-start gap-2">
              <UserIcon className="h-4 w-4 text-slate-500 mt-0.5" />
              <span>
                <span className="block text-sm font-bold text-slate-900 break-words">
                  Show my gender on my verified profile
                </span>
                <span className="block text-[11px] text-slate-500 break-words">
                  When enabled, recruiters will see the gender value you entered on your
                  profile. Off by default for privacy.
                </span>
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showDobOnVerified}
              onChange={(e) => setShowDobOnVerified(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-[#E31B23] focus:ring-[#E31B23]"
            />
            <span className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-slate-500 mt-0.5" />
              <span>
                <span className="block text-sm font-bold text-slate-900 break-words">
                  Show my date of birth on my verified profile
                </span>
                <span className="block text-[11px] text-slate-500 break-words">
                  When enabled, recruiters will see your date of birth. Off by default
                  for privacy.
                </span>
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showAddressOnVerified}
              onChange={(e) => setShowAddressOnVerified(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-[#E31B23] focus:ring-[#E31B23]"
            />
            <span className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-slate-500 mt-0.5" />
              <span>
                <span className="block text-sm font-bold text-slate-900 break-words">
                  Show my address on my verified profile
                </span>
                <span className="block text-[11px] text-slate-500 break-words">
                  When enabled, recruiters will see the address/area you entered on
                  your profile. Off by default for privacy.
                </span>
              </span>
            </span>
          </label>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {verifiedShareUrl ? (
            <a
              href={verifiedShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E31B23] hover:underline break-words"
            >
              <BadgeCheck className="h-3.5 w-3.5" /> Preview your public verified profile
            </a>
          ) : (
            <p className="text-xs text-slate-500">
              Your verified profile link will appear here once you have an active passport.
            </p>
          )}
          <button
            onClick={saveVerifiedProfilePrivacy}
            disabled={verifiedProfileSaving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-red-500/25 hover:opacity-95 disabled:opacity-60 whitespace-nowrap"
          >
            <Save size={14} />
            {verifiedProfileSaving ? 'Saving…' : 'Save Verified Profile Settings'}
          </button>
        </div>
      </div>

      <PublicVisibilitySection initialPrivacy={user?.privacy_settings} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <p className="text-xs text-slate-500">
          Changes apply immediately after you save.
        </p>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-red-500/25 hover:opacity-95 disabled:opacity-60 whitespace-nowrap"
        >
          <Save size={14} />
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default UserSettingsPage;