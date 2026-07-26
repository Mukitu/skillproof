/**
 * Governance / RBAC routes — Super Admin only.
 *
 * Every endpoint:
 *  - Hard-checks SUPER_ADMIN role via the authed profile.
 *  - Writes an immutable audit_logs row capturing the old/new state.
 *  - Captures IP, user-agent and browser from req.context.
 *
 * Endpoints:
 *   POST /api/governance/admins           — create new admin
 *   DELETE /api/governance/admins/:id     — remove admin role (demote)
 *   POST /api/governance/admins/:id/suspend — suspend / unsuspend admin
 *   POST /api/governance/permissions      — grant permission
 *   DELETE /api/governance/permissions    — revoke permission
 *   GET  /api/governance/permissions/:id  — list permissions for profile
 */
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, getAdminClient, type AuthedRequest } from '../middleware/auth.js';
import { adminRateLimit } from '../middleware/rateLimit.js';
import { getContext } from '../middleware/context.js';

const router = Router();
router.use(requireAuth, adminRateLimit);

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'mukituislamnishat@gmail.com').toLowerCase();

function isDesignatedSuperAdmin(req: AuthedRequest): boolean {
  return req.profile?.role === 'super_admin' && req.profile.email.toLowerCase() === SUPER_ADMIN_EMAIL;
}

router.use((req: AuthedRequest, res, next) => {
  if (!isDesignatedSuperAdmin(req)) {
    return res.status(403).json({ error: `Only the designated Super Admin (${SUPER_ADMIN_EMAIL}) can perform this action.` });
  }
  next();
});

/** Audit helper. */
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
    console.warn('[governance audit] failed:', error.message);
  }
}

// ----- Create admin -----
const createAdminSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).optional(),
});
router.post('/admins', async (req: AuthedRequest, res) => {
  const parsed = createAdminSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const admin = getAdminClient();
  // Look up the target profile in advance so we can capture before/after.
  const { data: targetBefore } = await admin
    .from('profiles')
    .select('id, email, full_name, role, role_status, is_suspended')
    .eq('email', parsed.data.email)
    .maybeSingle();
  if (targetBefore?.role === 'super_admin' || targetBefore?.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Cannot modify the designated Super Admin account.' });
  }
  try {
    const { data, error } = await admin.rpc('fn_admin_create_admin', {
      p_email: parsed.data.email,
      p_full_name: parsed.data.full_name ?? null,
    });
    if (error) return res.status(400).json({ error: error.message });
    const { data: targetAfter } = await admin
      .from('profiles')
      .select('id, email, full_name, role, role_status, is_suspended')
      .eq('id', data)
      .maybeSingle();
    await audit(admin, req, {
      action: 'CREATE_ADMIN',
      entityType: 'user',
      entityId: data,
      oldValue: targetBefore || null,
      newValue: targetAfter || { id: data, email: parsed.data.email },
      metadata: { granted_by: req.profile?.id },
    });
    res.json({ success: true, profile_id: data });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Could not create admin.' });
  }
});

// ----- Remove admin (demote) -----
router.delete('/admins/:id', async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const admin = getAdminClient();
  const { data: targetBefore } = await admin
    .from('profiles')
    .select('id, email, role, role_status, is_suspended')
    .eq('id', id)
    .maybeSingle();
  if (!targetBefore) return res.status(404).json({ error: 'User not found.' });
  if (targetBefore.role === 'super_admin') {
    return res.status(403).json({ error: 'Cannot demote the Super Admin.' });
  }
  const { error } = await admin.rpc('fn_admin_remove_admin', { p_target_profile_id: id });
  if (error) return res.status(400).json({ error: error.message });
  const { data: targetAfter } = await admin
    .from('profiles')
    .select('id, email, role, role_status, is_suspended')
    .eq('id', id)
    .maybeSingle();
  await audit(admin, req, {
    action: 'REMOVE_ADMIN',
    entityType: 'user',
    entityId: id,
    oldValue: targetBefore,
    newValue: targetAfter || null,
    metadata: { revoked_by: req.profile?.id },
  });
  res.json({ success: true });
});

// ----- Suspend / unsuspend admin -----
const suspendSchema = z.object({ suspended: z.boolean() });
router.post('/admins/:id/suspend', async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const parsed = suspendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const admin = getAdminClient();
  const { data: targetBefore } = await admin
    .from('profiles')
    .select('id, email, role, role_status, is_suspended')
    .eq('id', id)
    .maybeSingle();
  if (!targetBefore) return res.status(404).json({ error: 'User not found.' });
  if (targetBefore.role === 'super_admin') {
    return res.status(403).json({ error: 'Cannot suspend the Super Admin.' });
  }
  const { error } = await admin.rpc('fn_admin_suspend_admin', {
    p_target_profile_id: id,
    p_suspended: parsed.data.suspended,
  });
  if (error) return res.status(400).json({ error: error.message });
  const { data: targetAfter } = await admin
    .from('profiles')
    .select('id, email, role, role_status, is_suspended')
    .eq('id', id)
    .maybeSingle();
  await audit(admin, req, {
    action: parsed.data.suspended ? 'SUSPEND_ADMIN' : 'ACTIVATE_ADMIN',
    entityType: 'user',
    entityId: id,
    oldValue: targetBefore,
    newValue: targetAfter || null,
  });
  res.json({ success: true });
});

// ----- Grant / revoke permission -----
const permSchema = z.object({
  target_profile_id: z.string().uuid(),
  permission: z.enum([
    'passport.review','passport.renew','passport.suspend',
    'assessment.review','assessment.score',
    'category.manage','roadmap.manage','roadmap.publish','job.manage','job.publish',
    'analytics.view','audit.view',
    'user.suspend','user.activate','user.premium'
  ]),
});

router.post('/permissions', async (req: AuthedRequest, res) => {
  const parsed = permSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const admin = getAdminClient();
  const { data: before } = await admin
    .from('admin_permissions')
    .select('*')
    .eq('profile_id', parsed.data.target_profile_id)
    .eq('permission', parsed.data.permission)
    .maybeSingle();
  const { error } = await admin.rpc('fn_admin_assign_role', {
    p_target_profile_id: parsed.data.target_profile_id,
    p_permission: parsed.data.permission,
    p_grant: true,
  });
  if (error) return res.status(400).json({ error: error.message });
  await audit(admin, req, {
    action: 'GRANT_PERMISSION',
    entityType: 'admin_permission',
    entityId: parsed.data.target_profile_id,
    newValue: { permission: parsed.data.permission },
    oldValue: before || null,
    metadata: { granted_by: req.profile?.id },
  });
  res.json({ success: true });
});

router.delete('/permissions', async (req: AuthedRequest, res) => {
  const parsed = permSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const admin = getAdminClient();
  const { data: before } = await admin
    .from('admin_permissions')
    .select('*')
    .eq('profile_id', parsed.data.target_profile_id)
    .eq('permission', parsed.data.permission)
    .maybeSingle();
  const { error } = await admin.rpc('fn_admin_assign_role', {
    p_target_profile_id: parsed.data.target_profile_id,
    p_permission: parsed.data.permission,
    p_grant: false,
  });
  if (error) return res.status(400).json({ error: error.message });
  await audit(admin, req, {
    action: 'REVOKE_PERMISSION',
    entityType: 'admin_permission',
    entityId: parsed.data.target_profile_id,
    oldValue: before || null,
    newValue: null,
    metadata: { revoked_by: req.profile?.id },
  });
  res.json({ success: true });
});

// ----- List permissions for profile -----
router.get('/permissions/:id', async (req: AuthedRequest, res) => {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('admin_permissions')
    .select('*')
    .eq('profile_id', req.params.id)
    .order('granted_at', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ permissions: data ?? [] });
});

export default router;