/**
 * RBAC service — granular admin permissions.
 *
 * Super Admin always has all permissions implicitly.
 * Admin permission grants live in `admin_permissions` and are queried via
 * the `fn_admin_has_permission` RPC. The list is also cached in the
 * browser for fast UI gating (the UI uses realtime subscription to keep
 * the cache hot).
 */
import { supabase } from '../lib/supabase';
import type { AdminPermission, AdminPermissionKey } from '../types/database';

/** All permissions a Super Admin implicitly has. */
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

/** Human-readable labels for each permission (used in the Super Admin UI). */
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

/**
 * Fetch every permission row for an admin profile.
 */
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

/**
 * Check if the current authenticated caller has a permission.
 * Super Admins always return true.
 */
export async function currentUserHasPermission(permission: AdminPermissionKey): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('fn_admin_has_permission', { p_permission: permission });
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

/** Grant / revoke a permission for a target admin profile. */
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

/** Promote a user (by email) to Admin. */
export async function createAdmin(email: string, fullName?: string): Promise<string> {
  const { data, error } = await supabase.rpc('fn_admin_create_admin', {
    p_email: email,
    p_full_name: fullName ?? null,
  });
  if (error) throw error;
  return data as string;
}

/** Demote an admin back to a regular user. */
export async function removeAdmin(profileId: string): Promise<void> {
  const { error } = await supabase.rpc('fn_admin_remove_admin', { p_target_profile_id: profileId });
  if (error) throw error;
}

/** Suspend / unsuspend an admin account. */
export async function setAdminSuspended(profileId: string, suspended: boolean): Promise<void> {
  const { error } = await supabase.rpc('fn_admin_suspend_admin', {
    p_target_profile_id: profileId,
    p_suspended: suspended,
  });
  if (error) throw error;
}