
import { supabase } from '../lib/supabase';
import type { AdminPermission, AdminPermissionKey } from '../types/database';


export const ALL_PERMISSIONS: AdminPermissionKey[] = [
  'passport.review',
  'passport.renew',
  'passport.suspend',
  'assessment.review',
  'assessment.score',
  'category.manage',
  'roadmap.manage',
  'roadmap.publish',
  'job.manage',
  'job.publish',
  'analytics.view',
  'audit.view',
  'user.suspend',
  'user.activate',
  'user.premium',
];


export const PERMISSION_LABELS: Record<AdminPermissionKey, { label: string; group: string }> = {
  'passport.review':  { label: 'Review passport submissions', group: 'Passports' },
  'passport.renew':   { label: 'Approve renewals', group: 'Passports' },
  'passport.suspend': { label: 'Suspend / unsuspend passports', group: 'Passports' },
  'assessment.review':{ label: 'Review assessment submissions', group: 'Assessments' },
  'assessment.score': { label: 'Override assessment scores', group: 'Assessments' },
  'category.manage':  { label: 'Manage categories & skills', group: 'Taxonomy' },
  'roadmap.manage':   { label: 'Manage roadmap templates', group: 'Roadmaps' },
  'roadmap.publish':  { label: 'Publish roadmap templates', group: 'Roadmaps' },
  'job.manage':       { label: 'Manage jobs', group: 'Jobs' },
  'job.publish':      { label: 'Publish jobs', group: 'Jobs' },
  'analytics.view':   { label: 'View analytics dashboard', group: 'Governance' },
  'audit.view':       { label: 'View audit logs', group: 'Governance' },
  'user.suspend':     { label: 'Suspend users', group: 'Users' },
  'user.activate':    { label: 'Activate users', group: 'Users' },
  'user.premium':     { label: 'Manage premium status', group: 'Users' },
};


export async function listAdminPermissions(profileId: string): Promise<AdminPermission[]> {
  if (!profileId) return [];
  const { data, error } = await supabase
    .from('admin_permissions')
    .select('*')
    .eq('profile_id', profileId)
    .order('granted_at', { ascending: false });
  if (error) throw error;
  return (data as AdminPermission[]) ?? [];
}


export async function currentUserHasPermission(permission: AdminPermissionKey): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('fn_admin_has_permission', { p_permission: permission });
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}


export async function setAdminPermission(
  targetProfileId: string,
  permission: AdminPermissionKey,
  grant: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('fn_admin_assign_role', {
    p_target_profile_id: targetProfileId,
    p_permission: permission,
    p_grant: grant,
  });
  if (error) throw error;
}


export async function createAdmin(email: string, fullName?: string): Promise<string> {
  const { data, error } = await supabase.rpc('fn_admin_create_admin', {
    p_email: email,
    p_full_name: fullName ?? null,
  });
  if (error) throw error;
  return data as string;
}


export async function removeAdmin(profileId: string): Promise<void> {
  const { error } = await supabase.rpc('fn_admin_remove_admin', { p_target_profile_id: profileId });
  if (error) throw error;
}


export async function setAdminSuspended(profileId: string, suspended: boolean): Promise<void> {
  const { error } = await supabase.rpc('fn_admin_suspend_admin', {
    p_target_profile_id: profileId,
    p_suspended: suspended,
  });
  if (error) throw error;
}

export interface GovernanceContext {
  is_super_admin: boolean;
  super_admin_email: string;
  current_user_email: string | null;
  current_role: string | null;
}


export async function getGovernanceContext(): Promise<GovernanceContext> {
  const { data, error } = await supabase.rpc('fn_admin_list_governance_context');
  if (error) throw error;
  const ctx = (data ?? {}) as Partial<GovernanceContext>;
  return {
    is_super_admin: Boolean(ctx.is_super_admin),
    super_admin_email: String(ctx.super_admin_email ?? '').toLowerCase(),
    current_user_email: ctx.current_user_email ?? null,
    current_role: ctx.current_role ?? null,
  };
}


export async function setSuperAdminEmail(email: string): Promise<string> {
  const { data, error } = await supabase.rpc('fn_set_super_admin_email', { p_new_email: email });
  if (error) throw error;
  return String(data ?? '').toLowerCase();
}