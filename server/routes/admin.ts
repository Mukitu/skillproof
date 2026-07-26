/**
 * Admin routes: privileged actions that require the service role.
 *
 * Audit policy:
 *   Every successful admin action writes an `audit_logs` row with
 *   actor_id, actor_email, action, entity_type, entity_id,
 *   old_value (JSONB before), new_value (JSONB after),
 *   ip, user_agent, browser — all captured via req.context.
 *
 * Storage policy:
 *   Any delete that owns storage objects cleans them BEFORE the DB row goes.
 *   For users: avatar + resume + all their assessment-evidence.
 */
import { Router } from 'express';
import { requireAuth, getAdminClient, type AuthedRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { adminRateLimit } from '../middleware/rateLimit.js';
import { getContext } from '../middleware/context.js';
import { z } from 'zod';

const router = Router();

router.use(requireAuth, requireAdmin, adminRateLimit);

const SUPER_ADMIN_ONLY = (req: AuthedRequest, res: any, next: any) => {
  if (req.profile?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin role required' });
  }
  next();
};

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'mukituislamnishat@gmail.com').toLowerCase();

function isDesignatedSuperAdmin(req: AuthedRequest): boolean {
  return req.profile?.role === 'super_admin' && req.profile.email.toLowerCase() === SUPER_ADMIN_EMAIL;
}

const DESIGNATED_SUPER_ADMIN_ONLY = (req: AuthedRequest, res: any, next: any) => {
  if (!isDesignatedSuperAdmin(req)) {
    return res.status(403).json({ error: `Only the designated Super Admin (${SUPER_ADMIN_EMAIL}) can perform this action.` });
  }
  next();
};

/**
 * Loads the target profile and enforces user-management scope:
 * - designated Super Admin can manage normal users and Admins;
 * - Admin can manage normal users only;
 * - nobody can modify the designated Super Admin through user-management routes.
 */
async function loadManageableTarget(req: AuthedRequest, res: any, targetId: string) {
  const admin = getAdminClient();
  const { data: target, error } = await admin
    .from('profiles')
    .select('id, user_id, email, full_name, role, role_status, is_suspended, premium_until')
    .eq('id', targetId)
    .maybeSingle();
  if (error || !target) {
    res.status(404).json({ error: 'User not found' });
    return null;
  }
  if (target.role === 'super_admin' || target.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
    res.status(403).json({ error: 'The designated Super Admin account cannot be modified here.' });
    return null;
  }
  if (!isDesignatedSuperAdmin(req) && target.role !== 'user') {
    res.status(403).json({ error: 'Admins can manage normal users only.' });
    return null;
  }
  return target;
}

/**
 * Helper: write an audit row using the new fn_audit_log RPC that supports
 * old_value, new_value, ip, user_agent, browser.
 */
async function audit(
  admin: ReturnType<typeof getAdminClient>,
  req: AuthedRequest,
  args: {
    action: string;
    entityType: string;
    entityId?: string | null;
    oldValue?: unknown;
    newValue?: unknown;
    metadata?: Record<string, unknown>;
  }
) {
  const ctx = getContext(req);
  const { error } = await admin.rpc('fn_audit_log', {
    p_action: args.action,
    p_entity_type: args.entityType,
    p_entity_id: args.entityId ?? null,
    p_metadata: args.metadata ?? {},
    p_old_value: args.oldValue === undefined ? null : (args.oldValue as any),
    p_new_value: args.newValue === undefined ? null : (args.newValue as any),
    p_ip: ctx.ip,
    p_user_agent: ctx.userAgent,
    p_browser: ctx.browser,
  });
  if (error) {
    // Non-fatal — log to server stderr but don't fail the caller.
    console.warn('[audit] fn_audit_log failed:', error.message);
  }
}

/**
 * Helper: remove a single storage object by path inside a bucket.
 * Returns true if removed, false otherwise (not found / error is non-fatal).
 */
async function removeStorageObject(
  admin: ReturnType<typeof getAdminClient>,
  bucket: 'profiles' | 'resumes' | 'assessment-evidence' | 'roadmap-assets',
  path: string | null | undefined
): Promise<boolean> {
  if (!path) return false;
  try {
    const { error } = await admin.storage.from(bucket).remove([path]);
    if (error) {
      console.warn(`[storage] remove ${bucket}/${path} failed:`, error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn(`[storage] remove ${bucket}/${path} threw:`, err?.message || err);
    return false;
  }
}

/**
 * Helper: delete all storage objects owned by a user (avatar + resume + evidence).
 * Called BEFORE auth.admin.deleteUser so we don't orphan files.
 */
async function cleanupUserStorage(
  admin: ReturnType<typeof getAdminClient>,
  userRowId: string,
  userAuthId: string
): Promise<{ avatar: boolean; resume: boolean; evidence: number }> {
  const result = { avatar: false, resume: false, evidence: 0 };

  // 1. Avatar in `profiles` bucket — convention: {userAuthId}/avatar.{ext}
  //    We also clear the column later, so first try any avatar path.
  const avatarCandidates = [
    `${userAuthId}/avatar`,
    `${userAuthId}/avatar.png`,
    `${userAuthId}/avatar.jpg`,
    `${userAuthId}/avatar.jpeg`,
    `${userAuthId}/avatar.webp`,
  ];
  for (const p of avatarCandidates) {
    const ok = await removeStorageObject(admin, 'profiles', p);
    if (ok) result.avatar = true;
  }
  // Also try the exact path stored on profile row (if present).
  const { data: prof } = await admin
    .from('profiles')
    .select('avatar_url')
    .eq('id', userRowId)
    .maybeSingle();
  if (prof?.avatar_url) {
    // avatar_url is a public URL; extract path after /object/public/profiles/
    const m = prof.avatar_url.match(/\/object\/(?:public|sign)\/profiles\/(.+?)(?:\?|$)/);
    if (m && m[1]) {
      const ok = await removeStorageObject(admin, 'profiles', decodeURIComponent(m[1]));
      if (ok) result.avatar = true;
    }
  }

  // 2. Resume in `resumes` bucket.
  const { data: profFull } = await admin
    .from('profiles')
    .select('resume_storage_path')
    .eq('id', userRowId)
    .maybeSingle();
  if (profFull?.resume_storage_path) {
    const ok = await removeStorageObject(admin, 'resumes', profFull.resume_storage_path);
    if (ok) result.resume = true;
  }

  // 3. All assessment-evidence storage rows owned by this user (via universal_assessments).
  const { data: subs } = await admin
    .from('universal_assessment_evidence')
    .select('storage_path, bucket')
    .not('storage_path', 'is', null);
  if (subs && subs.length) {
    // We need to filter to this user's evidence via the submission chain.
    const { data: mySubs } = await admin
      .from('universal_submissions')
      .select('id')
      .eq('user_id', userRowId);
    const myIds = new Set((mySubs || []).map((s: any) => s.id));
    const { data: ev } = await admin
      .from('universal_assessment_evidence')
      .select('storage_path, bucket, submission_id')
      .not('storage_path', 'is', null);
    for (const row of ev || []) {
      if (myIds.has((row as any).submission_id)) {
        const ok = await removeStorageObject(
          admin,
          ((row as any).bucket || 'assessment-evidence') as any,
          (row as any).storage_path
        );
        if (ok) result.evidence++;
      }
    }
  }

  return result;
}

// ============================================================================
// User management
// ============================================================================

router.post('/users/:id/suspend', async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const { reason } = req.body ?? {};
  const target = await loadManageableTarget(req, res, id);
  if (!target) return;
  const admin = getAdminClient();
  const before = { is_suspended: target.is_suspended, suspended_reason: target.role_status };
  const { error } = await admin.rpc('fn_admin_suspend_user', {
    p_target_id: id, p_reason: reason || 'No reason provided',
  });
  if (error) return res.status(400).json({ error: error.message });
  await audit(admin, req, {
    action: 'SUSPEND_USER', entityType: 'user', entityId: id,
    oldValue: before, newValue: { is_suspended: true, reason: reason || 'No reason provided' },
  });
  res.json({ success: true });
});

router.post('/users/:id/activate', async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const target = await loadManageableTarget(req, res, id);
  if (!target) return;
  const admin = getAdminClient();
  const before = { is_suspended: target.is_suspended, role_status: target.role_status };
  const { error } = await admin.rpc('fn_admin_activate_user', { p_target_id: id });
  if (error) return res.status(400).json({ error: error.message });
  await audit(admin, req, {
    action: 'ACTIVATE_USER', entityType: 'user', entityId: id,
    oldValue: before, newValue: { is_suspended: false, role_status: 'active' },
  });
  res.json({ success: true });
});

router.post('/users/:id/role', DESIGNATED_SUPER_ADMIN_ONLY, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const { role } = req.body ?? {};
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Only "user" or "admin" can be assigned here.' });
  }
  const admin = getAdminClient();
  const { data: target } = await admin
    .from('profiles')
    .select('id, email, role')
    .eq('id', id)
    .maybeSingle();
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'super_admin' || target.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
    return res.status(403).json({ error: 'The designated Super Admin role cannot be modified.' });
  }
  const { data: before } = await admin
    .from('profiles').select('role').eq('id', id).maybeSingle();
  const { error } = await admin.rpc('fn_admin_set_role', { p_target_id: id, p_role: role });
  if (error) return res.status(400).json({ error: error.message });
  await audit(admin, req, {
    action: 'SET_ROLE', entityType: 'user', entityId: id,
    oldValue: before ? { role: before.role } : null, newValue: { role },
  });
  res.json({ success: true });
});

router.post('/users/:id/premium', async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const { until } = req.body ?? {};
  const target = await loadManageableTarget(req, res, id);
  if (!target) return;
  const admin = getAdminClient();
  const { error } = await admin.rpc('fn_admin_set_premium', {
    p_target_id: id, p_until: until || null,
  });
  if (error) return res.status(400).json({ error: error.message });
  await audit(admin, req, {
    action: 'SET_PREMIUM', entityType: 'user', entityId: id,
    oldValue: { premium_until: target.premium_until }, newValue: { premium_until: until || null },
  });
  res.json({ success: true });
});

router.post('/users/:id/reset-password', async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const target = await loadManageableTarget(req, res, id);
  if (!target) return;
  const admin = getAdminClient();
  const { data, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'recovery', email: target.email,
  });
  if (linkErr) return res.status(400).json({ error: linkErr.message });
  await audit(admin, req, {
    action: 'RESET_PASSWORD', entityType: 'user', entityId: id,
    newValue: { email: target.email },
  });
  res.json({ success: true, link: data?.properties?.action_link });
});

// ============================================================================
// User DELETE — storage-first rule, then auth.users, then profiles.
// ============================================================================
router.delete('/users/:id', DESIGNATED_SUPER_ADMIN_ONLY, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const target = await loadManageableTarget(req, res, id);
  if (!target) return;
  const admin = getAdminClient();

  // 1. Capture before snapshot for audit.
  const beforeSnapshot = {
    id, user_id: target.user_id, email: target.email,
    full_name: target.full_name, role: target.role,
  };

  // 2. Storage cleanup FIRST. We log failures but never block the delete —
  //    orphaned storage files are cheaper than stranded user accounts.
  let cleanup = { avatar: false, resume: false, evidence: 0 };
  try {
    cleanup = await cleanupUserStorage(admin, id, target.user_id);
  } catch (err: any) {
    console.warn('[admin] storage cleanup before user delete failed:', err?.message || err);
  }

  const errors: { step: string; message: string }[] = [];

  // 3. Delete from public.profiles first. The schema has NO FK from
  //    profiles.user_id -> auth.users.id, so auth.admin.deleteUser does NOT
  //    drop the profiles row. If we leave it behind, the user keeps showing
  //    up in the admin list forever — which is what the bug report says.
  const { error: profileErr } = await admin.from('profiles').delete().eq('id', id);
  if (profileErr) errors.push({ step: 'profiles', message: profileErr.message });

  // 4. Then remove the Supabase Auth user. We intentionally ignore the error
  //    if the auth user is already missing — that just means the profile
  //    was orphaned from auth earlier.
  const { error: authErr } = await admin.auth.admin.deleteUser(target.user_id);
  if (authErr && !/user not found/i.test(authErr.message ?? '')) {
    errors.push({ step: 'auth', message: authErr.message });
  }

  // 5. Audit with old → null + cleanup detail.
  await audit(admin, req, {
    action: 'DELETE_USER', entityType: 'user', entityId: id,
    oldValue: beforeSnapshot, newValue: null,
    metadata: { storage_cleanup: cleanup, errors },
  });

  if (errors.length > 0) {
    return res.status(500).json({
      error: 'Could not fully delete user.',
      details: errors,
      // Surface a friendlier top-level message but include detail for debugging.
    });
  }

  res.json({ success: true, storage_cleanup: cleanup });
});

// ============================================================================
// Bulk operations
// ============================================================================
const bulkDeleteSchema = z.object({
  table: z.enum(['categories', 'sub_categories', 'skills', 'jobs', 'roadmap_templates']),
  ids: z.array(z.string().uuid()).min(1).max(100),
});
router.post('/bulk/delete', async (req: AuthedRequest, res) => {
  const parsed = bulkDeleteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const admin = getAdminClient();
  // Capture the rows before deletion so audit can show what was removed.
  const { data: rowsBefore } = await admin
    .from(parsed.data.table)
    .select('*')
    .in('id', parsed.data.ids);
  const { data, error } = await admin.rpc('fn_admin_bulk_delete', {
    p_table: parsed.data.table, p_ids: parsed.data.ids,
  });
  if (error) return res.status(400).json({ error: error.message });
  await audit(admin, req, {
    action: 'BULK_DELETE', entityType: parsed.data.table,
    oldValue: rowsBefore || null,
    newValue: null,
    metadata: { count: parsed.data.ids.length },
  });
  res.json({ success: true, count: data });
});

const bulkUpdateSchema = z.object({
  table: z.enum(['categories', 'sub_categories', 'skills', 'jobs', 'roadmap_templates']),
  ids: z.array(z.string().uuid()).min(1).max(100),
  column: z.enum(['status', 'display_order', 'difficulty']),
  value: z.string(),
});
router.post('/bulk/update', async (req: AuthedRequest, res) => {
  const parsed = bulkUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const admin = getAdminClient();
  const { data: rowsBefore } = await admin
    .from(parsed.data.table)
    .select('id, status, display_order, difficulty')
    .in('id', parsed.data.ids);
  const { data, error } = await admin.rpc('fn_admin_bulk_update', {
    p_table: parsed.data.table, p_ids: parsed.data.ids,
    p_column: parsed.data.column, p_value: parsed.data.value,
  });
  if (error) return res.status(400).json({ error: error.message });
  await audit(admin, req, {
    action: 'BULK_UPDATE', entityType: parsed.data.table,
    oldValue: rowsBefore || null,
    newValue: { [parsed.data.column]: parsed.data.value },
    metadata: { count: parsed.data.ids.length, ids: parsed.data.ids },
  });
  res.json({ success: true, count: data });
});

// ============================================================================
// Storage cleanup
// ============================================================================

/**
 * Orphan cleanup: scan universal_assessment_evidence rows whose parent
 * universal_submissions has gone (FK violation). Removes the storage object
 * and the DB row.
 */
router.post('/storage/cleanup-orphans', async (req: AuthedRequest, res) => {
  const admin = getAdminClient();
  // Find evidence rows whose submission_id is missing.
  const { data: orphans, error } = await admin
    .from('universal_assessment_evidence')
    .select('id, storage_path, bucket')
    .not('storage_path', 'is', null);
  if (error) return res.status(400).json({ error: error.message });

  const removed: any[] = [];
  for (const row of orphans || []) {
    const { data: parentExists } = await admin
      .from('universal_submissions')
      .select('id')
      .eq('id', (row as any).submission_id)
      .maybeSingle();
    if (!parentExists) {
      const ok = await removeStorageObject(
        admin,
        ((row as any).bucket || 'assessment-evidence') as any,
        (row as any).storage_path
      );
      // Drop the evidence row regardless of storage outcome.
      await admin.from('universal_assessment_evidence').delete().eq('id', (row as any).id);
      removed.push({ id: (row as any).id, path: (row as any).storage_path, removed_storage: ok });
    }
  }
  await audit(admin, req, {
    action: 'CLEANUP_ORPHANS', entityType: 'storage',
    metadata: { removed_count: removed.length },
    newValue: removed,
  });
  res.json({ success: true, removed });
});

// ============================================================================
// Super-admin-only
// ============================================================================
router.post('/bootstrap-super-admin', DESIGNATED_SUPER_ADMIN_ONLY, async (req: AuthedRequest, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  const admin = getAdminClient();
  const { error } = await admin.rpc('bootstrap_super_admin', { target_email: email });
  if (error) return res.status(400).json({ error: error.message });
  await audit(admin, req, {
    action: 'BOOTSTRAP_SUPER_ADMIN', entityType: 'user',
    newValue: { email },
  });
  res.json({ success: true });
});

export default router;