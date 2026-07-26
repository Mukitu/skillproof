const fs = require('fs');

let content = `import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dbService } from '../../services/db';
import { ProjectSubmission, CodingSubmission, SkillPassport, AuditLog } from '../../types/database';
import {
  LayoutDashboard,
  CheckSquare,
  Award,
  Code,
  FolderGit2,
  Users,
  Briefcase,
  History,
  ArrowRight,
  Clock,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export const AdminDashboard: React.FC = () => {
  const [projectSubs, setProjectSubs] = useState<ProjectSubmission[]>([]);
  const [codingSubs, setCodingSubs] = useState<CodingSubmission[]>([]);
  const [passports, setPassports] = useState<SkillPassport[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // Aggregate stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    todaysUsers: 0,
    premiumUsers: 0,
    careerProfiles: 0,
    roadmaps: 0,
    categories: 0,
    skills: 0,
    assessments: 0,
    codingChallenges: 0,
    projectChallenges: 0,
    jobs: 0,
  });

  useEffect(() => {
    loadAdminStats();
    
    let subscriptions: any[] = [];
    if (isSupabaseConfigured) {
       const sub = supabase.channel('admin-dashboard-changes')
       .on('postgres_changes', { event: '*', schema: 'public', table: 'project_submissions' }, loadAdminStats)
       .on('postgres_changes', { event: '*', schema: 'public', table: 'coding_submissions' }, loadAdminStats)
       .on('postgres_changes', { event: '*', schema: 'public', table: 'skill_passports' }, loadAdminStats)
       .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, loadAdminStats)
       .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, loadAdminStats)
       .subscribe();
       subscriptions.push(sub);
    }
    return () => {
      subscriptions.forEach(s => supabase.removeChannel(s));
    };
  }, []);

  const fetchCount = async (table: string, filters?: (query: any) => any) => {
    if (!isSupabaseConfigured) return 0;
    try {
      let query = supabase.from(table).select('*', { count: 'exact', head: true });
      if (filters) query = filters(query);
      const { count } = await query;
      return count || 0;
    } catch {
      return 0;
    }
  };

  const loadAdminStats = async () => {
    const [
      ps, cs, psp, alg,
      totalUsers, todaysUsers, premiumUsers, careerProfiles, roadmaps,
      categories, skills, assessments, codingChallenges, projectChallenges, jobs
    ] = await Promise.all([
      dbService.getProjectSubmissions(),
      dbService.getCodingSubmissions(),
      dbService.getAllSkillPassports(),
      dbService.getAuditLogs(),
      fetchCount('profiles'),
      fetchCount('profiles', q => {
        const today = new Date();
        today.setHours(0,0,0,0);
        return q.gte('created_at', today.toISOString());
      }),
      fetchCount('profiles', q => q.eq('is_premium', true)),
      fetchCount('ai_career_profiles'),
      fetchCount('roadmaps'),
      fetchCount('categories'),
      fetchCount('skills'),
      fetchCount('universal_assessments'),
      fetchCount('coding_challenges'),
      fetchCount('project_challenges'),
      fetchCount('jobs')
    ]);

    setProjectSubs(ps);
    setCodingSubs(cs);
    setPassports(psp);
    setLogs(alg);

    setStats({
      totalUsers, todaysUsers, premiumUsers, careerProfiles, roadmaps, categories, skills, assessments, codingChallenges, projectChallenges, jobs
    });
  };

  const pendingProjects = projectSubs.filter((p) => p.status === 'Pending');
  const pendingCoding = codingSubs.filter((p) => p.status === 'Pending Review');

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-semibold border border-cyan-500/20">
            <LayoutDashboard className="w-4 h-4" /> Live Platform Supervisor Control Panel
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Live Admin Overview
          </h1>
          <p className="text-xs text-slate-300 max-w-xl">
            Realtime data synchronization from Supabase aggregate queries.
          </p>
        </div>
      </div>

      {/* Overview Stat Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-400' },
          { label: "Today's Users", value: stats.todaysUsers, icon: Users, color: 'text-indigo-400' },
          { label: 'Premium Users', value: stats.premiumUsers, icon: Award, color: 'text-amber-400' },
          { label: 'Career Profiles', value: stats.careerProfiles, icon: Briefcase, color: 'text-pink-400' },
          { label: 'Roadmaps', value: stats.roadmaps, icon: Activity, color: 'text-purple-400' },
          { label: 'Categories', value: stats.categories, icon: FolderGit2, color: 'text-cyan-400' },
          { label: 'Skills', value: stats.skills, icon: Code, color: 'text-teal-400' },
          { label: 'Assessments', value: stats.assessments, icon: CheckSquare, color: 'text-green-400' },
          { label: 'Coding Challenges', value: stats.codingChallenges, icon: Code, color: 'text-rose-400' },
          { label: 'Project Challenges', value: stats.projectChallenges, icon: FolderGit2, color: 'text-orange-400' },
          { label: 'Pending Reviews', value: pendingProjects.length + pendingCoding.length, icon: Clock, color: 'text-amber-500' },
          { label: 'Approved Passports', value: passports.length, icon: Award, color: 'text-emerald-400' },
          { label: 'Jobs', value: stats.jobs, icon: Briefcase, color: 'text-blue-500' },
          { label: 'Submissions', value: projectSubs.length + codingSubs.length, icon: CheckSquare, color: 'text-cyan-500' },
          { label: 'Audit Logs', value: logs.length, icon: History, color: 'text-slate-400' },
        ].map((stat, idx) => (
          <div key={idx} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-tight">{stat.label}</span>
              <stat.icon className={\`w-4 h-4 \${stat.color}\`} />
            </div>
            <p className="text-2xl font-black text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Manual Verification Queue */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
              <CheckSquare className="w-4 h-4 text-amber-400" /> Pending Project Manual Review
            </h2>
            <Link to="/admin/project-submissions" className="text-xs text-cyan-400 font-bold hover:underline">
              View All Queue →
            </Link>
          </div>

          {pendingProjects.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-6 bg-slate-950 rounded-2xl text-center">
              All project submissions have been reviewed! No pending reviews in queue.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingProjects.slice(0, 5).map((sub) => (
                <div key={sub.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{sub.user_name || 'Candidate'}</span>
                    <span className="text-[11px] text-slate-500">{new Date(sub.created_at).toLocaleDateString()}</span>
                  </div>

                  <p className="text-slate-400 text-[11px] truncate">
                    Repo: <span className="font-mono text-cyan-400">{sub.github_url}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit Log Feed */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
              <History className="w-4 h-4 text-cyan-400" /> Recent System Audit Activity
            </h2>
            <Link to="/admin/audit-logs" className="text-xs text-cyan-400 font-bold hover:underline">
              Full Logs →
            </Link>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {logs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs flex justify-between items-center">
                <div>
                  <p className="font-bold text-white font-mono">{log.action}</p>
                  <p className="text-[11px] text-slate-400">Entity: {log.entity_type}</p>
                </div>
                <span className="text-[10px] text-slate-500">{new Date(log.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
`;

fs.writeFileSync('src/pages/admin/AdminDashboard.tsx', content);
