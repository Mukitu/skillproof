import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getUser } from '../../services/admin';
import { listAllSubmissions } from '../../services/assessments';
import { getAllPassports } from '../../services/passports';
import type { Profile, UniversalSubmission, SkillPassport } from '../../types/database';

export default function AdminUserDetailPage() {
  const { id = '' } = useParams();
  const [user, setUser] = useState<Profile | null>(null);
  const [subs, setSubs] = useState<UniversalSubmission[]>([]);
  const [passports, setPassports] = useState<SkillPassport[]>([]);
  useEffect(() => { (async () => {
    setUser(await getUser(id));
    setSubs((await listAllSubmissions()).filter((s) => s.user_id === id));
    setPassports((await getAllPassports()).filter((p) => p.user_id === id));
  })(); }, [id]);
  if (!user) return <div className="p-8 text-gray-500">Loading user…</div>;
  return <div className="space-y-6">
    <Link to="/admin/users" className="inline-flex items-center gap-2 text-sm text-blue-600"><ArrowLeft size={16}/>Back to Users</Link>
    <div className="rounded-xl border bg-white p-6"><h1 className="text-2xl font-bold">{user.full_name}</h1><p className="text-gray-500">{user.email}</p>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4"><div><span className="text-xs text-gray-500">Role</span><p>{user.role}</p></div><div><span className="text-xs text-gray-500">Status</span><p>{user.is_suspended ? 'Suspended' : 'Active'}</p></div><div><span className="text-xs text-gray-500">Verification</span><p>{user.verification_status}</p></div><div><span className="text-xs text-gray-500">Created</span><p>{new Date(user.created_at).toLocaleDateString()}</p></div></div>
    </div>
    <section><h2 className="mb-3 text-lg font-semibold">Passports ({passports.length})</h2><div className="grid gap-3 md:grid-cols-2">{passports.map((p) => <div key={p.id} className="rounded-lg border bg-white p-4"><p className="font-medium">{p.title}</p><p className="text-sm text-gray-500">{p.status} · {p.passport_number}</p></div>)}</div></section>
    <section><h2 className="mb-3 text-lg font-semibold">Submissions ({subs.length})</h2><div className="overflow-hidden rounded-lg border bg-white">{subs.map((s) => <div key={s.id} className="border-b p-4 text-sm"><span className="font-mono">{s.id.slice(0,8)}</span><span className="ml-3">{s.status}</span><span className="ml-3 text-gray-500">{s.score ?? '—'}/100</span></div>)}</div></section>
  </div>;
}
