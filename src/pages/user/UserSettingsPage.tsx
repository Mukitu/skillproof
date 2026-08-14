import { useEffect, useState } from 'react';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Languages,
  Bell,
  ShieldCheck,
  Phone,
  BadgeCheck,
  Sparkles,
  Link as LinkIcon,
  Activity,
  MapPin,
  Calendar,
  User as UserIcon,
  Mail,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  Lock as LockIcon,
  Globe,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateMyProfile } from '../../services/auth';
import { PublicVisibilitySection } from '../../components/passport/PublicVisibilitySection';

export const UserSettingsPage = () => {
  const { user, refresh, changeMyPassword } = useAuth();
  const [language, setLanguage] = useState(user?.language || 'bn');
  const [notifications, setNotifications] = useState(user?.notification_settings || { email: true, job_alerts: true, verification_updates: true });
  const [privacy, setPrivacy] = useState(user?.privacy_settings || { public_profile: true, show_phone: true });

  // NEW privacy toggles (positive semantics — default ON where safe).
  const [allowEmployerVerification, setAllowEmployerVerification] = useState<boolean>(true);
  const [showAiOnVerified, setShowAiOnVerified] = useState<boolean>(true);
  const [showEvidenceOnVerified, setShowEvidenceOnVerified] = useState<boolean>(true);
  const [showCareerActivityOnVerified, setShowCareerActivityOnVerified] = useState<boolean>(true);
  const [showAssessmentHistoryOnVerified, setShowAssessmentHistoryOnVerified] = useState<boolean>(true);

  // Legacy per-section hide toggles (kept for back-compat).
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

  // Change-password local state.
  const [cpCurrent, setCpCurrent] = useState('');
  const [cpNew, setCpNew] = useState('');
  const [cpConfirm, setCpConfirm] = useState('');
  const [cpShowCurrent, setCpShowCurrent] = useState(false);
  const [cpShowNew, setCpShowNew] = useState(false);
  const [cpShowConfirm, setCpShowConfirm] = useState(false);
  const [cpSaving, setCpSaving] = useState(false);
  const [cpError, setCpError] = useState<string | null>(null);
  const [cpSuccess, setCpSuccess] = useState<string | null>(null);

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
      // NEW positive toggles.
      setAllowEmployerVerification(
        (user as any)?.allow_employer_verification !== false,
      );
      setShowAiOnVerified((user as any)?.show_ai_career_profile !== false);
      setShowEvidenceOnVerified((user as any)?.show_public_evidence !== false);
      setShowCareerActivityOnVerified(
        (user as any)?.show_career_activity !== false,
      );
      setShowAssessmentHistoryOnVerified(
        (user as any)?.show_assessment_history !== false,
      );
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
      // Master switch + new positive toggles. Backfill both the new
      // column-backed flags AND the legacy hide_* boolean so the old
      // RPC keeps its expected gating.
      await updateMyProfile({
        allow_employer_verification: allowEmployerVerification,
        show_ai_career_profile: showAiOnVerified,
        show_public_evidence: showEvidenceOnVerified,
        show_career_activity: showCareerActivityOnVerified,
        show_assessment_history: showAssessmentHistoryOnVerified,
        show_phone_on_verified_profile: showPhoneOnVerified,
        hide_ai_on_verified_profile: !showAiOnVerified,
        hide_evidence_on_verified_profile: !showEvidenceOnVerified,
        hide_timeline_on_verified_profile: !showCareerActivityOnVerified,
        show_gender_on_verified_profile: showGenderOnVerified,
        show_dob_on_verified_profile: showDobOnVerified,
        show_address_on_verified_profile: showAddressOnVerified,
      } as any);
      // Mirror the master switch into privacy_settings JSONB too,
      // because the legacy read path still keys off it.
      const mergedPrivacy: Record<string, boolean> = {
        ...(privacy || {}),
        public_employer_view: allowEmployerVerification,
        show_assessment_history: showAssessmentHistoryOnVerified,
      };
      await updateMyProfile({ privacy_settings: mergedPrivacy });
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

  const submitChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setCpError(null);
    setCpSuccess(null);
    setCpSaving(true);
    try {
      const result = await changeMyPassword(cpCurrent, cpNew, cpConfirm);
      if (result?.error) {
        setCpError(result.error.message ?? 'Could not change password.');
        return;
      }
      setCpSuccess('Password changed successfully.');
      setCpCurrent('');
      setCpNew('');
      setCpConfirm('');
    } catch (err: any) {
      setCpError(err?.message ?? 'Could not change password.');
    } finally {
      setCpSaving(false);
      // Clear success message after 4 seconds.
      if (cpSuccess !== null) {
        window.setTimeout(() => setCpSuccess(null), 4000);
      }
    }
  };

  const verifiedShareUrl = (() => {
    const passport = (user as any)?.passport_number || (user as any)?.verification_token || null;
    if (!passport) return null;
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${encodeURIComponent(passport)}`;
  })();

  return (
    <div className="space-y-6">
      {/* ---------- Page header ---------- */}
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
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl break-words">
            Account Settings
          </h1>
          <p className="mt-1 text-sm text-slate-500 break-words">
            Manage your account identity, security, and verified profile visibility.
          </p>
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

      {/* ---------- ACCOUNT ---------- */}
      <SettingsSection
        id="account"
        title="Account"
        description="Identity and account-level information."
        icon={<ShieldCheck className="w-4 h-4 text-[#E31B23]" />}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoRow
            icon={Mail}
            label="Account Email"
            value={user?.email ?? '—'}
            locked
            lockHint="This email is permanently associated with your SkillProof account and cannot be changed from profile settings."
          />
          <InfoRow
            icon={UserIcon}
            label="Account Type"
            value={(user?.role || 'user').toString().toUpperCase()}
          />
          <InfoRow
            icon={BadgeCheck}
            label="Account Status"
            value={
              (user as any)?.is_suspended
                ? 'Suspended'
                : (user as any)?.role_status === 'active' || !(user as any)?.role_status
                  ? 'Active'
                  : (user as any)?.role_status
            }
          />
          <InfoRow
            icon={Calendar}
            label="Member Since"
            value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
          />
        </div>
      </SettingsSection>

      {/* ---------- SECURITY ---------- */}
      <SettingsSection
        id="security"
        title="Security"
        description="Change the password used to sign in to your SkillProof account."
        icon={<KeyRound className="w-4 h-4 text-[#E31B23]" />}
      >
        {cpError && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{cpError}</span>
          </div>
        )}
        {cpSuccess && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700" role="status">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <span>{cpSuccess}</span>
          </div>
        )}

        <form onSubmit={submitChangePassword} className="space-y-4">
          <PasswordField
            label="Current Password"
            value={cpCurrent}
            onChange={setCpCurrent}
            show={cpShowCurrent}
            onToggle={() => setCpShowCurrent((v) => !v)}
            icon={LockIcon}
            autoComplete="current-password"
            disabled={cpSaving}
          />
          <PasswordField
            label="New Password"
            value={cpNew}
            onChange={setCpNew}
            show={cpShowNew}
            onToggle={() => setCpShowNew((v) => !v)}
            icon={KeyRound}
            autoComplete="new-password"
            disabled={cpSaving}
          />
          <PasswordField
            label="Confirm New Password"
            value={cpConfirm}
            onChange={setCpConfirm}
            show={cpShowConfirm}
            onToggle={() => setCpShowConfirm((v) => !v)}
            icon={KeyRound}
            autoComplete="new-password"
            disabled={cpSaving}
          />
          <p className="text-[11px] text-slate-500">
            Password must be at least 8 characters and contain both letters and numbers.
          </p>
          <button
            type="submit"
            disabled={cpSaving || !cpCurrent || !cpNew || !cpConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E31B23] to-[#F97316] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-red-500/25 hover:opacity-95 disabled:opacity-60 whitespace-nowrap"
          >
            {cpSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Changing…
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Change Password
              </>
            )}
          </button>
        </form>
      </SettingsSection>

      {/* ---------- LANGUAGE ---------- */}
      <SettingsSection
        id="language"
        title="Language"
        description="Choose the language used across SkillProof."
        icon={<Languages className="w-4 h-4 text-[#E31B23]" />}
      >
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'bn' | 'en')}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm sm:w-auto focus:border-[#E31B23] focus:outline-none focus:ring-2 focus:ring-red-100"
        >
          <option value="bn">বাংলা (Bengali)</option>
          <option value="en">English</option>
        </select>
      </SettingsSection>

      {/* ---------- NOTIFICATIONS ---------- */}
      <SettingsSection
        id="notifications"
        title="Notifications"
        description="Choose which emails SkillProof sends you."
        icon={<Bell className="w-4 h-4 text-[#E31B23]" />}
      >
        <div className="space-y-2.5">
          {([
            { k: 'email', label: 'Email notifications', hint: 'General product updates and account security emails.' },
            { k: 'job_alerts', label: 'Job alerts', hint: 'New jobs matched to your SkillProof profile.' },
            { k: 'verification_updates', label: 'Verification result updates', hint: 'When a passport / skill is verified or rejected.' },
          ]).map((row) => (
            <label key={row.k} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!(notifications as any)[row.k]}
                onChange={(e) => setNotifications({ ...notifications, [row.k]: e.target.checked })}
                className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-[#E31B23] focus:ring-[#E31B23]"
              />
              <span>
                <span className="block text-sm font-bold text-slate-900 break-words">{row.label}</span>
                <span className="block text-[11px] text-slate-500 break-words">{row.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </SettingsSection>

      {/* ---------- PROFILE VISIBILITY ---------- */}
      <SettingsSection
        id="profile-visibility"
        title="Profile Visibility"
        description="General SkillProof profile visibility (private dashboard). Independent of the Verified Profile / Employer Recruitment settings below."
        icon={<ShieldCheck className="w-4 h-4 text-[#E31B23]" />}
      >
        <div className="space-y-2.5">
          <ToggleRow
            checked={!!privacy.public_profile}
            onChange={(v) => setPrivacy({ ...privacy, public_profile: v })}
            icon={Globe}
            title="Make my SkillProof profile public"
            description="Allow other SkillProof members to discover your profile on the user directory."
          />
          <ToggleRow
            checked={!!privacy.show_phone}
            onChange={(v) => setPrivacy({ ...privacy, show_phone: v })}
            icon={Phone}
            title="Show phone number on profile"
            description="Show your phone number on your private dashboard profile. This is separate from the Verified Profile phone display."
          />
        </div>
      </SettingsSection>

      {/* ---------- VERIFIED PROFILE VISIBILITY ---------- */}
      <SettingsSection
        id="verified-profile-visibility"
        title="Verified Profile Privacy"
        description="Control what recruiters and employers see when they view your SkillProof Verified Profile at /verify."
        icon={<BadgeCheck className="w-4 h-4 text-[#E31B23]" />}
      >
        {verifiedProfileSaved && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            <CheckCircle2 size={16} /> Verified profile privacy updated.
          </div>
        )}
        <div className="space-y-2.5">
          <ToggleRow
            checked={allowEmployerVerification}
            onChange={setAllowEmployerVerification}
            icon={BadgeCheck}
            title="Allow Employer Verification"
            description="Allow recruiters and employers to view your verified SkillProof profile. When OFF, your verified profile shows a private screen — no skills, assessment, or PII."
          />
          <ToggleRow
            checked={showPhoneOnVerified}
            onChange={setShowPhoneOnVerified}
            icon={Phone}
            title="Show phone number"
            description="Show your phone number on the verified profile. Off by default."
          />
          <ToggleRow
            checked={showGenderOnVerified}
            onChange={setShowGenderOnVerified}
            icon={UserIcon}
            title="Show gender"
            description="Show your gender on the verified profile. Off by default."
          />
          <ToggleRow
            checked={showDobOnVerified}
            onChange={setShowDobOnVerified}
            icon={Calendar}
            title="Show date of birth"
            description="Show your date of birth on the verified profile. Off by default."
          />
          <ToggleRow
            checked={showAddressOnVerified}
            onChange={setShowAddressOnVerified}
            icon={MapPin}
            title="Show address"
            description="Show your address on the verified profile. Off by default."
          />
          <ToggleRow
            checked={showAiOnVerified}
            onChange={setShowAiOnVerified}
            icon={Sparkles}
            title="Show AI Career Profile"
            description="Allow recruiters to see your AI-generated career summary, strengths, career readiness, ATS score, and recommended skills. On by default."
          />
          <ToggleRow
            checked={showEvidenceOnVerified}
            onChange={setShowEvidenceOnVerified}
            icon={LinkIcon}
            title="Show Public Evidence links"
            description="Allow recruiters to access your GitHub, portfolio, live projects, and other public evidence. On by default."
          />
          <ToggleRow
            checked={showCareerActivityOnVerified}
            onChange={setShowCareerActivityOnVerified}
            icon={Activity}
            title="Show Career Activity Timeline"
            description="Allow recruiters to see verified career activity such as assessment results, certificate issuance, and roadmap completion. On by default."
          />
          <ToggleRow
            checked={showAssessmentHistoryOnVerified}
            onChange={setShowAssessmentHistoryOnVerified}
            icon={BadgeCheck}
            title="Show Assessment History"
            description="Allow recruiters to see your completed assessments, results, scores, and verified skill performance. On by default."
          />
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
      </SettingsSection>

      {/* ---------- EMPLOYER VERIFICATION (master switch duplicates Allow row, but kept for legacy compliance) ---------- */}
      <SettingsSection
        id="employer-verification"
        title="Employer Verification"
        description="Master switch for the public /verify page. When OFF, recruiters see a private screen instead of your profile."
        icon={<BadgeCheck className="w-4 h-4 text-[#E31B23]" />}
      >
        <ToggleRow
          checked={allowEmployerVerification}
          onChange={setAllowEmployerVerification}
          icon={BadgeCheck}
          title="Allow Employer Verification"
          description="When OFF, your verified profile is hidden from public recruiters. Save changes to apply."
        />
      </SettingsSection>

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

/* ---------- shared subcomponents ---------- */

function SettingsSection({
  id,
  title,
  description,
  icon,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm"
    >
      <div className="mb-4 flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-[#E31B23]">
          {icon}
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {description ? (
            <p className="text-[12px] text-slate-500 break-words">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function ToggleRow({
  checked,
  onChange,
  title,
  description,
  icon: Icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-[#E31B23] focus:ring-[#E31B23]"
      />
      <span className="flex min-w-0 flex-1 items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <span className="min-w-0">
          <span className="block text-sm font-bold text-slate-900 break-words">{title}</span>
          {description ? (
            <span className="block text-[11px] text-slate-500 break-words">{description}</span>
          ) : null}
        </span>
      </span>
    </label>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  locked,
  lockHint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  locked?: boolean;
  lockHint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-0.5 break-words text-sm font-bold text-slate-900">{value}</p>
          {locked ? (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500">
              <Lock className="h-3 w-3" />
              {lockHint ?? 'This field is permanently bound to your account.'}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  icon: Icon,
  autoComplete,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  icon: React.ComponentType<{ className?: string }>;
  autoComplete?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-9 py-2.5 text-sm text-slate-900 focus:border-[#E31B23] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 disabled:opacity-60"
          disabled={disabled}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default UserSettingsPage;