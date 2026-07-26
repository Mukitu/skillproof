import { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, Search, Send } from 'lucide-react';
import { listActiveJobs, listMyApplications, listSavedJobIds, applyToJob, toggleSavedJob } from '../../services/jobs';
import { useRealtimeRefresh } from '../../services/realtime';
import type { Job } from '../../types/database';

export const UserJobPortalPage = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [applied, setApplied] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [active, setActive] = useState<Job | null>(null);
  const [cover, setCover] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [j, s, a] = await Promise.all([listActiveJobs(), listSavedJobIds(), listMyApplications()]);
      setJobs(j); setSaved(s); setApplied(a.map((x) => x.job_id));
    } catch (e: any) { setError(e.message); }
  };
  useEffect(() => { load(); }, []);
  useRealtimeRefresh(['jobs', 'job_applications', 'saved_jobs'], load);

  const filtered = jobs.filter((j) => (!search || j.title.toLowerCase().includes(search.toLowerCase()) || j.company_name.toLowerCase().includes(search.toLowerCase())) && (type === 'all' || j.job_type === type));

  const toggleSave = async (id: string) => {
    try { const isSaved = await toggleSavedJob(id); setSaved((p) => isSaved ? [...p, id] : p.filter((x) => x !== id)); } catch (e: any) { setError(e.message); }
  };
  const apply = async () => {
    if (!active) return;
    try { await applyToJob(active.id, cover); setApplied((p) => [...p, active.id]); setActive(null); setCover(''); } catch (e: any) { setError(e.message); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Job Portal</h1>
      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs" className="w-full rounded border py-2 pl-9 pr-3" /></div>
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded border px-3 py-2">
          <option value="all">All types</option><option>Full-time</option><option>Part-time</option><option>Remote</option><option>Contract</option><option>Internship</option>
        </select>
      </div>
      <div className="grid gap-4">
        {filtered.map((j) => (
          <div key={j.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-start justify-between">
              <div><h3 className="font-semibold">{j.title}</h3><p className="text-sm text-gray-500">{j.company_name} · {j.location} · {j.job_type}</p></div>
              <div className="flex gap-2">
                <button onClick={() => toggleSave(j.id)} className="rounded p-2 text-gray-500 hover:bg-gray-100">{saved.includes(j.id) ? <BookmarkCheck className="text-red-600" size={18}/> : <Bookmark size={18}/>}</button>
                {applied.includes(j.id) ? <span className="rounded bg-green-100 px-3 py-1 text-xs text-green-700">Applied</span> : <button onClick={() => setActive(j)} className="rounded bg-blue-600 px-3 py-1 text-sm text-white">Apply</button>}
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-700">{j.description}</p>
            <div className="mt-2 flex flex-wrap gap-2">{j.required_skills.map((s) => <span key={s} className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">{s}</span>)}</div>
          </div>
        ))}
        {!filtered.length && <div className="rounded border bg-white p-8 text-center text-gray-500">No jobs match.</div>}
      </div>
      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h3 className="font-semibold">Apply: {active.title}</h3>
            <p className="text-sm text-gray-500">{active.company_name}</p>
            <textarea value={cover} onChange={(e) => setCover(e.target.value)} placeholder="Cover letter (optional)" rows={6} className="mt-3 w-full rounded border px-3 py-2" />
            <div className="mt-3 flex gap-2"><button onClick={apply} className="flex items-center gap-1 rounded bg-blue-600 px-4 py-2 text-white"><Send size={16}/>Submit</button><button onClick={() => setActive(null)} className="rounded border px-4 py-2">Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserJobPortalPage;
