/**
 * AdminJobsPage — Jobs CRUD with shared AdminCRUDTable.
 */
import { useEffect, useState } from 'react';
import {
  AdminCRUDTable,
  type ColumnDef,
  type LifecycleButton,
  type BulkAction,
  type StatusOption,
} from '../../components/admin/AdminCRUDTable';
import { listAllJobs, adminCreateJob, adminUpdateJob, adminDeleteJob } from '../../services/jobs';
import { bulkUpdate, bulkDelete } from '../../services/admin';
import { useRealtimeRefresh } from '../../services/realtime';
import type { Job, JobStatus, JobType } from '../../types/database';

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'Active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'Closed', label: 'Closed', color: 'bg-gray-100 text-gray-800' },
  { value: 'Draft', label: 'Draft', color: 'bg-yellow-100 text-yellow-800' },
];

const empty = (): Omit<Job, 'id' | 'created_at' | 'updated_at'> => ({
  title: '', company_name: '', company_logo: null, location: '',
  job_type: 'Full-time', salary_range: '', required_skills: [], description: '',
  responsibilities: [], requirements: [], status: 'Active',
});

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [form, setForm] = useState<Omit<Job, 'id' | 'created_at' | 'updated_at'>>(empty());
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    try { setJobs(await listAllJobs()); } catch (e: any) { setError(e.message); }
  };
  useEffect(() => { void load(); }, []);
  useRealtimeRefresh('jobs', load);

  const submit = async (e: any) => {
    e.preventDefault(); setError('');
    try {
      if (editing) await adminUpdateJob(editing, form);
      else await adminCreateJob(form);
      setForm(empty()); setEditing(null); await load();
    } catch (e: any) { setError(e.message); }
  };

  const cols: ColumnDef<Job>[] = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'company_name', label: 'Company', sortable: true },
    { key: 'location', label: 'Location', sortable: true },
    { key: 'job_type', label: 'Type', sortable: true },
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
          title: j.title, company_name: j.company_name, company_logo: j.company_logo,
          location: j.location, job_type: j.job_type, salary_range: j.salary_range,
          required_skills: j.required_skills, description: j.description,
          responsibilities: j.responsibilities, requirements: j.requirements, status: j.status,
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Jobs Manager</h1>
      </div>
      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={submit} className="rounded-xl border bg-white p-4">
        <h2 className="mb-2 font-semibold">{editing ? 'Edit Job' : 'Create Job'}</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded border px-3 py-2" />
          <input required placeholder="Company" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="rounded border px-3 py-2" />
          <input placeholder="Logo URL" value={form.company_logo || ''} onChange={(e) => setForm({ ...form, company_logo: e.target.value || null })} className="rounded border px-3 py-2" />
          <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="rounded border px-3 py-2" />
          <select value={form.job_type} onChange={(e) => setForm({ ...form, job_type: e.target.value as JobType })} className="rounded border px-3 py-2"><option>Full-time</option><option>Part-time</option><option>Remote</option><option>Contract</option><option>Internship</option></select>
          <input placeholder="Salary range" value={form.salary_range} onChange={(e) => setForm({ ...form, salary_range: e.target.value })} className="rounded border px-3 py-2" />
          <input placeholder="Required skills (comma)" value={form.required_skills.join(',')} onChange={(e) => setForm({ ...form, required_skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} className="rounded border px-3 py-2" />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as JobStatus })} className="rounded border px-3 py-2"><option>Active</option><option>Closed</option><option>Draft</option></select>
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded border px-3 py-2 md:col-span-2" />
          <textarea placeholder="Responsibilities (one per line)" value={form.responsibilities.join('\n')} onChange={(e) => setForm({ ...form, responsibilities: e.target.value.split('\n').filter(Boolean) })} className="rounded border px-3 py-2 md:col-span-2" />
          <textarea placeholder="Requirements (one per line)" value={form.requirements.join('\n')} onChange={(e) => setForm({ ...form, requirements: e.target.value.split('\n').filter(Boolean) })} className="rounded border px-3 py-2 md:col-span-2" />
        </div>
        <div className="mt-3 flex gap-2">
          <button className="rounded bg-blue-600 px-4 py-2 text-white">{editing ? 'Update' : 'Create'}</button>
          {editing && <button type="button" onClick={() => { setEditing(null); setForm(empty()); }} className="rounded border px-4 py-2">Cancel</button>}
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