/**
 * Admin Dashboard — 16 live metric cards.
 * Every count comes from Supabase head:true counts; storage via fn_storage_total_bytes RPC.
 * Realtime refresh wired to all relevant tables.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserCheck, UserX, Layers, Code2, ListChecks, ClipboardList,
  Award, BadgeCheck, BadgeAlert, Briefcase, Map, HardDrive, UserPlus, FileCheck2,
} from 'lucide-react';
import { DashboardCard } from '../../components/admin/DashboardCard';
import { useDashboardCounts, formatBytes } from '../../hooks/useDashboardCounts';
import { useRealtimeRefresh } from '../../services/realtime';
import { listAllSubmissions } from '../../services/assessments';
import { listAuditLogs } from '../../services/audit';

export default function AdminDashboard() {
  const { counts, refresh } = useDashboardCounts();
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
  const [recentAudit, setRecentAudit] = useState<any[]>([]);

  const loadLists = async () => {
    const [subs, audits] = await Promise.all([listAllSubmissions(), listAuditLogs()]);
    setPendingSubmissions(subs.filter((s) => s.status === 'Pending Review').slice(0, 5));
    setRecentAudit(audits.slice(0, 5));
  };

  useEffect(() => { void loadLists(); }, []);

  useRealtimeRefresh(
    ['profiles', 'categories', 'skills', 'universal_assessments',
     'universal_submissions', 'skill_passports', 'jobs',
     'roadmap_templates', 'audit_logs'],
    () => { void refresh(); void loadLists(); }
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Live counters from Supabase. Updates automatically via realtime.
        </p>
      </div>

      {/* 16 enterprise metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard icon={Users}        label="Total Users"             value={counts.totalUsers}            color="bg-blue-500"    href="/admin/users" />
        <DashboardCard icon={UserCheck}    label="Active Users"            value={counts.activeUsers}           color="bg-emerald-500" href="/admin/users" />
        <DashboardCard icon={UserX}        label="Pending Users"           value={counts.pendingUsers}          color="bg-amber-500"   href="/admin/users" />
        <DashboardCard icon={Layers}       label="Total Categories"        value={counts.totalCategories}       color="bg-pink-500"    href="/admin/taxonomy" />
        <DashboardCard icon={Code2}        label="Total Skills"            value={counts.totalSkills}           color="bg-rose-500"    href="/admin/taxonomy" />
        <DashboardCard icon={ListChecks}   label="Total Assessments"       value={counts.totalAssessments}      color="bg-orange-500" />
        <DashboardCard icon={ClipboardList} label="Pending Assessments"    value={counts.pendingAssessments}    color="bg-red-500"     />
        <DashboardCard icon={FileCheck2}   label="Completed Assessments"   value={counts.completedAssessments}  color="bg-green-500"   href="/admin/assessment-review" />
        <DashboardCard icon={Award}        label="Total Skill Passports"   value={counts.totalPassports}        color="bg-indigo-500"  href="/admin/passport-review" />
        <DashboardCard icon={BadgeAlert}   label="Pending Passport Approval" value={counts.pendingPassports}    color="bg-amber-600"   href="/admin/passport-review" />
        <DashboardCard icon={BadgeCheck}   label="Verified Passports"      value={counts.verifiedPassports}     color="bg-green-600"   href="/admin/passport-review" />
        <DashboardCard icon={Briefcase}    label="Active Jobs"             value={counts.activeJobs}            color="bg-teal-500"    href="/admin/jobs" />
        <DashboardCard icon={Map}          label="Total Roadmaps"          value={counts.totalRoadmaps}         color="bg-purple-500"  href="/admin/roadmap-templates" />
        <DashboardCard icon={HardDrive}    label="Storage Usage"           value={formatBytes(counts.storageBytes)} color="bg-slate-500" subLabel={`${counts.storageBytes.toLocaleString()} bytes`} />
        <DashboardCard icon={UserPlus}     label="Today's New Users"       value={counts.todaysNewUsers}        color="bg-cyan-500"    subLabel="since 00:00" />
        <DashboardCard icon={FileCheck2}   label="Today's Submissions"     value={counts.todaysSubmissions}     color="bg-lime-600"    subLabel="since 00:00" href="/admin/assessment-review" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Pending Universal Submissions</h2>
            <Link to="/admin/assessment-review" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          {pendingSubmissions.length === 0 ? (
            <p className="text-sm text-gray-500">No pending reviews.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {pendingSubmissions.map((s) => (
                <li key={s.id} className="py-2 text-sm">
                  <span className="font-mono text-xs text-gray-500">{s.id.slice(0, 8)}</span>
                  <span className="ml-2 text-gray-700">{new Date(s.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Audit Activity</h2>
            <Link to="/admin/audit-logs" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          {recentAudit.length === 0 ? (
            <p className="text-sm text-gray-500">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentAudit.map((a) => (
                <li key={a.id} className="py-2 text-sm">
                  <span className="font-medium text-gray-800">{a.action}</span>
                  <span className="ml-2 text-gray-500">{a.entity_type}</span>
                  <span className="ml-2 text-xs text-gray-400">{new Date(a.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}