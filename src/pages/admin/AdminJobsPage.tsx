
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  AdminCRUDTable,
  type ColumnDef,
  type LifecycleButton,
  type BulkAction,
  type StatusOption,
} from '../../components/admin/AdminCRUDTable';
import {
  adminCreateJob, adminDeleteJob, adminUpdateJob, emptyJobInput, isValidApplyUrl, listAllJobs,
} from '../../services/jobs';
import { bulkUpdate, bulkDelete } from '../../services/admin';
import { useRealtimeRefresh } from '../../services/realtime';
import type {
  Job, JobStatus, JobType,
  JobExperienceLevel, JobSource,
} from '../../types/database';

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'Active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'Closed', label: 'Closed', color: 'bg-gray-100 text-gray-800' },
  { value: 'Draft', label: 'Draft', color: 'bg-yellow-100 text-yellow-800' },
];

const EXPERIENCE_OPTIONS: JobExperienceLevel[] = ['Entry', 'Mid', 'Senior', 'Lead', 'Director', 'Any'];
const SOURCE_OPTIONS: JobSource[] = ['LinkedIn', 'bdjobs', 'BDApps', 'Company Website', 'Other'];


const SkillsPicker: React.FC<{
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => {
  const [input, setInput] = useState('');
  const add = (raw?: string): void => {
    const name = (raw ?? input).trim();
    if (!name) return;
    if (value.some((s) => s.toLowerCase() === name.toLowerCase())) {
      setInput('');
      return;
    }
    onChange([...value, name]);
    setInput('');
  };
  const remove = (i: number): void => {
    onChange(value.filter((_, idx) => idx !== i));
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder ?? 'Add a skill — e.g. React, Node.js, PostgreSQL'}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => add()}
          className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
        >
          <Plus size={12} /> Add
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {value.length === 0 ? (
          <p className="text-[12px] text-slate-400">No skills yet. Add at least 3 to power AI matching.</p>
        ) : (
          value.map((s, i) => (
            <span
              key={`${s}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700"
            >
              {s}
              <button type="button" onClick={() => remove(i)} className="hover:opacity-70">
                <X size={11} />
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [form, setForm] = useState<Omit<Job, 'id' | 'created_at' | 'updated_at'>>(emptyJobInput());
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    try {
      setJobs(await listAllJobs());
      setError('');
    } catch (e: any) {
      setError(e.message);
    }
  };
  useEffect(() => { void load(); }, []);
  useRealtimeRefresh('jobs', load);

  const urlValid = useMemo(() => {
    
    if (!form.application_url) return true;
    return isValidApplyUrl(form.application_url);
  }, [form.application_url]);

  const canSave = useMemo(() => {
    if (!form.title.trim() || !form.company_name.trim()) return false;
    if (!urlValid) return false;
    return true;
  }, [form.title, form.company_name, urlValid]);

  const submit = async (e: any) => {
    e.preventDefault();
    const missingTitle = !form.title.trim();
    const missingCompany = !form.company_name.trim();
    const badUrl = !urlValid;
    if (missingTitle || missingCompany || badUrl) {
      const parts: string[] = [];
      if (missingTitle) parts.push('• Title is required.');
      if (missingCompany) parts.push('• Company name is required.');
      if (badUrl) parts.push('• Application URL must start with http:// or https://.');
      setError(parts.join(' '));
      return;
    }
    setError(''); setSuccess('');
    try {
      if (editing) {
        await adminUpdateJob(editing, form);
        setSuccess(`Job "${form.title}" updated.`);
      } else {
        await adminCreateJob(form);
        setSuccess(`Job "${form.title}" created.`);
      }
      setForm(emptyJobInput()); setEditing(null); await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const cols: ColumnDef<Job>[] = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'company_name', label: 'Company', sortable: true },
    { key: 'location', label: 'Location', sortable: true },
    { key: 'job_type', label: 'Type', sortable: true },
    { key: 'salary_range', label: 'Salary', sortable: true,
      render: (j) => j.salary_range || '—' },
    { key: 'deadline', label: 'Deadline', sortable: true,
      render: (j) => j.deadline ? new Date(j.deadline).toLocaleDateString() : '—' },
    { key: 'status', label: 'Status', sortable: true,
      render: (j) => <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{j.status}</span> },
    { key: 'created_at', label: 'Created', sortable: true,
      render: (j) => new Date(j.created_at).toLocaleDateString() },
  ];

  const lifecycle: LifecycleButton<Job>[] = [
    {
      action: 'publish', label: 'Publish',
      visible: (j) => j.status !== 'Active',
      onClick: async (j) => { await adminUpdateJob(j.id, { ...j, status: 'Active' }); await load(); },
    },
    {
      action: 'unpublish', label: 'Close',
      visible: (j) => j.status === 'Active',
      onClick: async (j) => { await adminUpdateJob(j.id, { ...j, status: 'Closed' }); await load(); },
    },
    {
      action: 'edit', label: 'Edit', color: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
      onClick: (j) => {
        setEditing(j.id);
        setForm({
          title: j.title,
          company_name: j.company_name,
          company_logo: j.company_logo,
          location: j.location,
          job_type: j.job_type,
          salary_range: j.salary_range,
          required_skills: j.required_skills,
          description: j.description,
          responsibilities: j.responsibilities,
          requirements: j.requirements,
          status: j.status,
          workplace: j.workplace ?? null,
          experience_level: j.experience_level ?? null,
          education: j.education ?? null,
          benefits: j.benefits ?? [],
          deadline: j.deadline ?? null,
          application_url: j.application_url ?? null,
          source: j.source ?? null,
        });
      },
    },
    {
      action: 'delete', label: 'Delete',
      onClick: async (j) => { if (confirm(`Delete job "${j.title}"?`)) { await adminDeleteJob(j.id); await load(); } },
    },
  ];

  const bulk: BulkAction[] = [
    { label: 'Delete', variant: 'danger',
      run: async (ids) => { await bulkDelete('jobs', ids); await load(); return true; } },
  ];
  const handleBulkStatus = async (ids: string[], status: string) => {
    await bulkUpdate('jobs', ids, 'status', status); await load(); return true;
  };

  return (
    <div className="space-y-6">
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
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl break-words">Jobs Manager</h1>
          <p className="mt-1 text-sm text-slate-500 break-words">Create, edit and publish job listings for the portal.</p>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">{editing ? 'Edit Job' : 'Create Job'}</h2>

        {}
        <fieldset className="space-y-3">
          <legend className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Core</legend>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              required placeholder="Job title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              required placeholder="Company name"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Company logo URL"
              value={form.company_logo || ''}
              onChange={(e) => setForm({ ...form, company_logo: e.target.value || null })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={form.job_type}
              onChange={(e) => setForm({ ...form, job_type: e.target.value as JobType })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Remote</option>
              <option>Contract</option>
              <option>Internship</option>
            </select>
            <input
              placeholder="Workplace (e.g. On-site, Hybrid)"
              value={form.workplace ?? ''}
              onChange={(e) => setForm({ ...form, workplace: e.target.value || null })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Salary range (e.g. ৳40k–60k / month)"
              value={form.salary_range}
              onChange={(e) => setForm({ ...form, salary_range: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="date"
              placeholder="Apply deadline"
              value={form.deadline ?? ''}
              onChange={(e) => setForm({ ...form, deadline: e.target.value || null })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={form.experience_level ?? ''}
              onChange={(e) => setForm({ ...form, experience_level: e.target.value || null })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Experience level…</option>
              {EXPERIENCE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <input
              placeholder="Education (e.g. Bachelor's in CS)"
              value={form.education ?? ''}
              onChange={(e) => setForm({ ...form, education: e.target.value || null })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as JobStatus })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option>Active</option>
              <option>Closed</option>
              <option>Draft</option>
            </select>
          </div>
        </fieldset>

        {}
        <fieldset className="space-y-3">
          <legend className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Application link</legend>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <input
                placeholder="https://… (LinkedIn, bdjobs, company careers page)"
                value={form.application_url ?? ''}
                onChange={(e) => setForm({ ...form, application_url: e.target.value || null })}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                  urlValid ? 'border-slate-300' : 'border-red-400 bg-red-50'
                }`}
              />
              {!urlValid && (
                <p className="mt-1 text-[11px] font-semibold text-red-600">
                  Application URL must start with http:// or https://
                </p>
              )}
              {urlValid && form.application_url && (
                <p className="mt-1 text-[11px] text-slate-500">
                  ✓ Opens the original application page in a new tab when users click "Apply on company site".
                </p>
              )}
            </div>
            <select
              value={form.source ?? ''}
              onChange={(e) => setForm({ ...form, source: e.target.value || null })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Source…</option>
              {SOURCE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </fieldset>

        {}
        <fieldset className="space-y-3">
          <legend className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Skills · Description · Lists</legend>
          <SkillsPicker
            value={form.required_skills}
            onChange={(next) => setForm({ ...form, required_skills: next })}
            placeholder="Add a skill — e.g. React, Node.js, PostgreSQL"
          />
          <textarea
            placeholder="Full job description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Responsibilities (one per line)"
            value={form.responsibilities.join('\n')}
            onChange={(e) => setForm({
              ...form,
              responsibilities: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
            })}
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Requirements (one per line)"
            value={form.requirements.join('\n')}
            onChange={(e) => setForm({
              ...form,
              requirements: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
            })}
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Benefits (one per line)"
            value={form.benefits.join('\n')}
            onChange={(e) => setForm({
              ...form,
              benefits: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
            })}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </fieldset>

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={!canSave}
            className="rounded-lg bg-gradient-to-r from-[#E31B23] to-[#F97316] px-5 py-2 text-sm font-bold text-white shadow hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {editing ? 'Update job' : 'Create job'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => { setEditing(null); setForm(emptyJobInput()); }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <AdminCRUDTable<Job>
        table="jobs"
        rows={jobs}
        columns={cols}
        statusOptions={STATUS_OPTIONS}
        statusField="status"
        searchableFields={['title', 'company_name', 'location']}
        defaultSort={{ key: 'created_at', dir: 'desc' }}
        lifecycleButtons={lifecycle}
        bulkActions={bulk}
        onBulkStatusChange={handleBulkStatus}
        emptyMessage="No jobs yet."
      />
    </div>
  );
}