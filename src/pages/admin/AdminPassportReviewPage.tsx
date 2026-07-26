/**
 * AdminPassportReviewPage — Enterprise Skill Passport review console.
 *
 * List + filters via AdminCRUDTable; selecting a passport opens a tabbed
 * review panel: Profile · CV · AI Career · Education · Experience · Projects ·
 * Assessment History · Evidence · Review Form.
 *
 * Review Form supports Approve / Request Revisions / Reject with Overall
 * Score (0–100) and feedback. Once a passport is active, a Level Override
 * dropdown is exposed alongside the audit trail.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminCRUDTable, type ColumnDef, type LifecycleButton, type StatusOption,
} from '../../components/admin/AdminCRUDTable';
import { PassportCard } from '../../components/passport/PassportCard';
import { LevelBadge } from '../../components/passport/LevelBadge';
import {
  adminOverridePassportLevel, adminReviewPassport, getAllPassports, getPassportOverview,
} from '../../services/passports';
import { useRealtimeRefresh } from '../../services/realtime';
import type {
  PassportLevel, PassportLevelHistory, PassportOverviewJoined, SkillPassport,
} from '../../types/database';

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'pending_approval', label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
  { value: 'suspended', label: 'Suspended', color: 'bg-gray-100 text-gray-800' },
];

type TabKey = 'profile' | 'cv' | 'ai' | 'education' | 'experience' | 'projects' | 'verifications' | 'evidence' | 'review';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'profile', label: 'Profile' },
  { key: 'cv', label: 'CV' },
  { key: 'ai', label: 'AI Career' },
  { key: 'education', label: 'Education' },
  { key: 'experience', label: 'Experience' },
  { key: 'projects', label: 'Projects' },
  { key: 'verifications', label: 'Assessment History' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'review', label: 'Review Form' },
];

export default function AdminPassportReviewPage() {
  const [passports, setPassports] = useState<SkillPassport[]>([]);
  const [active, setActive] = useState<SkillPassport | null>(null);
  const [overview, setOverview] = useState<PassportOverviewJoined | null>(null);
  const [tab, setTab] = useState<TabKey>('review');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Review form fields
  const [overallScore, setOverallScore] = useState<number>(75);
  const [feedback, setFeedback] = useState('');

  // Level override
  const [overrideLevel, setOverrideLevel] = useState<PassportLevel>('Bronze');
  const [overrideReason, setOverrideReason] = useState('');

  const load = async () => {
    try {
      setPassports(await getAllPassports());
      setError('');
    } catch (e: any) {
      setError(e.message);
    }
  };
  useEffect(() => { void load(); }, []);
  useRealtimeRefresh(
    ['skill_passports', 'passport_level_history', 'passport_renewal_history'],
    load,
  );

  const loadOverview = useCallback(async (passportId: string) => {
    try {
      const data = await getPassportOverview(passportId);
      setOverview(data);
    } catch (e: any) {
      setError(e?.message || 'Could not load passport overview.');
      setOverview(null);
    }
  }, []);

  useEffect(() => {
    if (!active) { setOverview(null); return; }
    setOverallScore(active.overall_score || 75);
    setFeedback(active.admin_feedback || '');
    setOverrideLevel(active.level);
    setOverrideReason('');
    void loadOverview(active.id);
  }, [active, loadOverview]);

  const pendingPassports = useMemo(
    () => passports.filter((p) => p.status === 'pending_approval'),
    [passports],
  );

  const cols: ColumnDef<SkillPassport>[] = [
    { key: 'passport_number', label: 'Passport #', sortable: true,
      render: (p) => <span className="font-mono text-xs">{p.passport_number}</span> },
    { key: 'title', label: 'Title', sortable: true,
      render: (p) => (
        <button
          onClick={() => setActive(p)}
          className="text-left font-medium text-blue-700 hover:underline"
        >
          {p.title}
        </button>
      ) },
    { key: 'main_category_name', label: 'Category', sortable: true,
      render: (p) => p.main_category_name ?? '—' },
    { key: 'level', label: 'Level', sortable: true,
      render: (p) => <LevelBadge level={p.level} size="sm" /> },
    { key: 'passed_count', label: 'Passed', sortable: true,
      render: (p) => <span className="tabular-nums">{p.passed_count}</span> },
    { key: 'overall_score', label: 'Overall', sortable: true,
      render: (p) => <span className="tabular-nums">{p.overall_score || '—'}/100</span> },
    { key: 'status', label: 'Status', sortable: true,
      render: (p) => <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{p.status}</span> },
    { key: 'created_at', label: 'Created', sortable: true,
      render: (p) => new Date(p.created_at).toLocaleDateString() },
  ];

  const lifecycle: LifecycleButton<SkillPassport>[] = [
    {
      action: 'activate', label: 'Review',
      visible: (p) => p.status === 'pending_approval',
      color: 'bg-blue-600 text-white hover:bg-blue-700',
      onClick: (p) => setActive(p),
    },
  ];

  const review = async (decision: 'approve' | 'reject' | 'request_revisions') => {
    if (!active) return;
    if (decision === 'approve' && !overallScore) { setError('Overall score is required to approve.'); return; }
    if (!feedback.trim()) { setError('Feedback is required.'); return; }
    setBusy(true); setError(''); setSuccess('');
    try {
      const result = await adminReviewPassport({
        passportId: active.id,
        overallScore,
        feedback: feedback.trim(),
        decision,
      });
      const verb = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'sent back for revisions';
      setSuccess(`Passport ${verb}. Level: ${result.level}.`);
      await load();
      setActive((current) => (current ? { ...current, ...result } : current));
    } catch (e: any) {
      setError(e?.message || 'Could not save review.');
    } finally {
      setBusy(false);
    }
  };

  const override = async () => {
    if (!active) return;
    if (!overrideReason.trim()) { setError('Reason is required to override the level.'); return; }
    setBusy(true); setError(''); setSuccess('');
    try {
      const result = await adminOverridePassportLevel({
        passportId: active.id,
        newLevel: overrideLevel,
        reason: overrideReason.trim(),
      });
      setSuccess(`Level overridden to ${result.level}.`);
      await load();
      setActive((current) => (current ? { ...current, ...result } : current));
    } catch (e: any) {
      setError(e?.message || 'Could not override level.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Skill Passport Review</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enterprise passport review · {pendingPassports.length} pending approval
          </p>
        </div>
      </div>

      {error && (
        <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>
      )}

      <AdminCRUDTable<SkillPassport>
        table="skill_passports"
        rows={passports}
        columns={cols}
        statusOptions={STATUS_OPTIONS}
        statusField="status"
        searchableFields={['passport_number', 'title', 'main_category_name']}
        defaultSort={{ key: 'created_at', dir: 'desc' }}
        lifecycleButtons={lifecycle}
        emptyMessage="No passports yet."
      />

      {active && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Reviewing · {active.passport_number}
              </p>
              <h2 className="mt-0.5 text-2xl font-bold text-slate-900">{active.title}</h2>
            </div>
            <button
              onClick={() => setActive(null)}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          <PassportCard passport={active} profile={overview?.profile ?? null} mode="full" />

          {/* Tabs */}
          <div className="border-b border-slate-200">
            <nav className="-mb-px flex flex-wrap gap-1 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`rounded-t-lg border-b-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                    tab === t.key
                      ? 'border-red-600 text-red-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="pt-2">
            {tab === 'profile' && <ProfileTab overview={overview} />}
            {tab === 'cv' && <CVTab overview={overview} />}
            {tab === 'ai' && <AITab overview={overview} />}
            {tab === 'education' && <EducationTab overview={overview} />}
            {tab === 'experience' && <ExperienceTab overview={overview} />}
            {tab === 'projects' && <ProjectsTab overview={overview} />}
            {tab === 'verifications' && <VerificationsTab overview={overview} />}
            {tab === 'evidence' && <EvidenceTab overview={overview} />}
            {tab === 'review' && (
              <ReviewForm
                passport={active}
                busy={busy}
                overallScore={overallScore}
                setOverallScore={setOverallScore}
                feedback={feedback}
                setFeedback={setFeedback}
                onSubmit={review}
                overrideLevel={overrideLevel}
                setOverrideLevel={setOverrideLevel}
                overrideReason={overrideReason}
                setOverrideReason={setOverrideReason}
                onOverride={override}
                levelHistory={overview?.level_history ?? []}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab components
// ---------------------------------------------------------------------------

function ProfileTab({ overview }: { overview: PassportOverviewJoined | null }) {
  const p = overview?.profile;
  if (!p) return <Empty msg="No profile found." />;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex items-center gap-4 md:col-span-2">
        {p.avatar_url
          ? <img src={p.avatar_url} alt={p.full_name} className="h-16 w-16 rounded-full object-cover ring-2 ring-amber-200" />
          : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-red-600 text-xl font-black text-white">{initials(p.full_name)}</div>}
        <div>
          <p className="text-lg font-bold">{p.full_name}</p>
          <p className="text-xs text-slate-500">{p.email}</p>
        </div>
      </div>
      <Field label="Phone" value={p.phone} />
      <Field label="Location" value={p.location} />
      <Field label="Profession" value={p.profession} />
      <Field label="Current position" value={p.current_position} />
      <Field label="Experience" value={p.experience_years != null ? `${p.experience_years} years` : null} />
      <Field label="Bio" value={p.bio} fullWidth />
      <Field label="GitHub" value={p.github_url} link />
      <Field label="LinkedIn" value={p.linkedin_url} link />
      <Field label="Portfolio" value={p.portfolio_url} link />
      <Field label="Website" value={p.website_url} link />
    </div>
  );
}

function CVTab({ overview }: { overview: PassportOverviewJoined | null }) {
  const path = overview?.profile?.resume_storage_path ?? overview?.profile?.resume_url ?? null;
  if (!path) return <Empty msg="No CV uploaded." />;
  // We just hand back the URL — admins can click to download.
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-700">Resume on file:</p>
      <a
        href={path}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100"
      >
        Open resume →
      </a>
    </div>
  );
}

function AITab({ overview }: { overview: PassportOverviewJoined | null }) {
  const ai = overview?.ai_career;
  if (!ai) return <Empty msg="No AI Career Profile generated yet." />;
  return (
    <div className="space-y-3">
      <Info label="Target role" value={ai.targetRole || ai.target_roles?.join(', ') || '—'} />
      <Info label="Top strengths" value={ai.strengths?.join(', ') || '—'} />
      <Info label="Missing skills" value={ai.missingSkills?.join(', ') || '—'} />
      <Info label="Completeness" value={ai.completeness_score != null ? `${ai.completeness_score}/100` : '—'} />
      <Info label="Confidence" value={ai.extraction_confidence != null ? `${ai.extraction_confidence}%` : '—'} />
      <details>
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">Raw JSON</summary>
        <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{JSON.stringify(ai, null, 2)}</pre>
      </details>
    </div>
  );
}

function EducationTab({ overview }: { overview: PassportOverviewJoined | null }) {
  const rows = overview?.educations ?? [];
  if (!rows.length) return <Empty msg="No education entries." />;
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
        <tr><th className="px-3 py-2 text-left">Degree</th><th className="px-3 py-2 text-left">Institution</th><th className="px-3 py-2 text-left">Year</th><th className="px-3 py-2 text-left">CGPA</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-slate-100">
            <td className="px-3 py-2">{r.degree ?? '—'}</td>
            <td className="px-3 py-2">{r.institution ?? '—'}</td>
            <td className="px-3 py-2">{r.year ?? '—'}</td>
            <td className="px-3 py-2">{r.cgpa ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ExperienceTab({ overview }: { overview: PassportOverviewJoined | null }) {
  const rows = overview?.experiences ?? [];
  if (!rows.length) return <Empty msg="No experience entries." />;
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.id} className="rounded-lg border border-slate-200 p-3">
          <p className="font-semibold text-slate-900">{r.role ?? '—'} <span className="text-xs font-normal text-slate-500">@ {r.company ?? '—'}</span></p>
          <p className="text-xs text-slate-500">{r.duration ?? '—'}</p>
          {r.summary && <p className="mt-1 text-sm text-slate-700">{r.summary}</p>}
        </div>
      ))}
    </div>
  );
}

function ProjectsTab({ overview }: { overview: PassportOverviewJoined | null }) {
  const passport = overview?.passport;
  const projects = (passport?.completed_projects as Array<{ title?: string; description?: string; link?: string }> | null) ?? [];
  if (!projects.length) return <Empty msg="No projects listed on this passport." />;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {projects.map((proj, idx) => (
        <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="font-semibold text-slate-900">{proj.title ?? 'Untitled project'}</p>
          {proj.description && <p className="mt-1 text-sm text-slate-700">{proj.description}</p>}
          {proj.link && (
            <a href={proj.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-blue-600 hover:underline">
              View →
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function VerificationsTab({ overview }: { overview: PassportOverviewJoined | null }) {
  const rows = overview?.verifications ?? [];
  if (!rows.length) return <Empty msg="No assessment history for this category." />;
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
        <tr>
          <th className="px-3 py-2 text-left">Task</th>
          <th className="px-3 py-2 text-left">Status</th>
          <th className="px-3 py-2 text-left">Score</th>
          <th className="px-3 py-2 text-left">Reviewed</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-slate-100">
            <td className="px-3 py-2">{r.task_title ?? '—'}</td>
            <td className="px-3 py-2">{r.status}</td>
            <td className="px-3 py-2 tabular-nums">{r.score ?? '—'}/10</td>
            <td className="px-3 py-2 text-xs text-slate-500">{r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EvidenceTab({ overview }: { overview: PassportOverviewJoined | null }) {
  // Legacy fallback: pull from completed_projects (links) and verifications (project_url).
  const projects = (overview?.passport?.completed_projects as Array<{ link?: string }> | null) ?? [];
  const verificationLinks = (overview?.verifications ?? [])
    .map((v) => v.project_url)
    .filter(Boolean) as string[];
  if (!projects.length && !verificationLinks.length) return <Empty msg="No submitted evidence." />;
  return (
    <ul className="space-y-1.5 text-sm">
      {projects.filter((p) => p.link).map((p, idx) => (
        <li key={`p-${idx}`}>
          <a className="text-blue-600 hover:underline" href={p.link} target="_blank" rel="noopener noreferrer">{p.link}</a>
        </li>
      ))}
      {verificationLinks.map((url, idx) => (
        <li key={`v-${idx}`}>
          <a className="text-blue-600 hover:underline" href={url} target="_blank" rel="noopener noreferrer">{url}</a>
        </li>
      ))}
    </ul>
  );
}

function ReviewForm({
  passport, busy, overallScore, setOverallScore, feedback, setFeedback, onSubmit,
  overrideLevel, setOverrideLevel, overrideReason, setOverrideReason, onOverride,
  levelHistory,
}: {
  passport: SkillPassport;
  busy: boolean;
  overallScore: number;
  setOverallScore: (n: number) => void;
  feedback: string;
  setFeedback: (s: string) => void;
  onSubmit: (decision: 'approve' | 'reject' | 'request_revisions') => void;
  overrideLevel: PassportLevel;
  setOverrideLevel: (l: PassportLevel) => void;
  overrideReason: string;
  setOverrideReason: (s: string) => void;
  onOverride: () => void;
  levelHistory: PassportLevelHistory[];
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        <p><strong>Eligibility:</strong> {passport.passed_count} passed · avg {Number(passport.average_marks).toFixed(1)}/10</p>
        <p><strong>Requested:</strong> {passport.requested_manually ? 'Manually by user' : 'Auto-eligibility (5+ passed)'}</p>
        {passport.requested_at && <p><strong>Requested at:</strong> {new Date(passport.requested_at).toLocaleString()}</p>}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Overall Score (0–100)
          <input
            type="number"
            min={0}
            max={100}
            value={overallScore}
            onChange={(e) => setOverallScore(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
          <p><strong>Platinum:</strong> 40+ passed · avg ≥ 9.5 · overall ≥ 95</p>
          <p><strong>Gold:</strong> 20+ passed · avg ≥ 8.5 · overall ≥ 85</p>
          <p><strong>Silver:</strong> 10+ passed · avg ≥ 7.5 · overall ≥ 75</p>
          <p><strong>Bronze:</strong> 5+ passed · avg ≥ 6.0 · overall ≥ 60</p>
        </div>
      </div>
      <label className="block text-sm font-semibold text-slate-700">
        Feedback (required for all decisions)
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Explain your decision."
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy}
          onClick={() => onSubmit('approve')}
          className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          disabled={busy}
          onClick={() => onSubmit('request_revisions')}
          className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          Request Revisions
        </button>
        <button
          disabled={busy}
          onClick={() => onSubmit('reject')}
          className="flex-1 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
        >
          Reject
        </button>
      </div>

      {passport.status === 'active' && (
        <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">Override level</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-semibold text-blue-900">
              New level
              <select
                value={overrideLevel}
                onChange={(e) => setOverrideLevel(e.target.value as PassportLevel)}
                className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-sm"
              >
                <option value="Bronze">Bronze</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="Platinum">Platinum</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-blue-900">
              Reason
              <input
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Why are you changing the level?"
                className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-sm"
              />
            </label>
          </div>
          <button
            onClick={onOverride}
            disabled={busy || !overrideReason.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Save override
          </button>
          {levelHistory.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-700">Audit trail</p>
              <ul className="space-y-1 text-xs">
                {levelHistory.map((h) => (
                  <li key={h.id} className="flex justify-between gap-2">
                    <span><LevelBadge level={h.old_level} size="sm" /> → <LevelBadge level={h.new_level} size="sm" /></span>
                    <span className="text-slate-600">{new Date(h.changed_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Tiny helpers ----------

function Field({ label, value, link, fullWidth }: { label: string; value: string | null; link?: boolean; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      {value ? (
        link
          ? <a href={value} target="_blank" rel="noopener noreferrer" className="break-all text-sm text-blue-600 hover:underline">{value}</a>
          : <p className="text-sm text-slate-800">{value}</p>
      ) : <p className="text-sm italic text-slate-400">—</p>}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm text-slate-800">{value}</p>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{msg}</p>;
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join('');
}