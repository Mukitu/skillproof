/**
 * Storage routes: signed-URL issuance for assessment evidence and resumes.
 */
import { Router } from 'express';
import { requireAuth, getAdminClient, type AuthedRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { adminRateLimit } from '../middleware/rateLimit.js';
import { z } from 'zod';

const router = Router();

const ALLOWED_MIME = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/x-7z-compressed',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
]);

router.post('/resume/sign-upload', requireAuth, adminRateLimit, async (req: AuthedRequest, res) => {
  const { fileName, mime, size } = req.body;
  if (!fileName || !mime) return res.status(400).json({ error: 'fileName and mime required' });
  if (!ALLOWED_MIME.has(mime)) return res.status(400).json({ error: 'Unsupported mime type' });
  if (size > 50 * 1024 * 1024) return res.status(413).json({ error: 'File too large' });
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${req.user!.id}/resumes/${Date.now()}-${safeName}`;
  const admin = getAdminClient();
  const { data, error } = await admin.storage.from('resumes').createSignedUploadUrl(path);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, path, signedUrl: data.signedUrl, token: data.token });
});

router.post('/evidence/sign-upload', requireAuth, adminRateLimit, async (req: AuthedRequest, res) => {
  const { submissionId, fileName, mime, size } = req.body;
  if (!submissionId || !fileName || !mime) {
    return res.status(400).json({ error: 'submissionId, fileName, mime required' });
  }
  if (!ALLOWED_MIME.has(mime)) return res.status(400).json({ error: 'Unsupported mime type' });
  if (size > 50 * 1024 * 1024) return res.status(413).json({ error: 'File too large' });

  const admin = getAdminClient();
  // Verify ownership of submission.
  const { data: sub } = await admin
    .from('universal_submissions')
    .select('user_id')
    .eq('id', submissionId)
    .single();
  if (!sub || sub.user_id !== req.profile!.id) {
    return res.status(403).json({ error: 'Not your submission' });
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${req.user!.id}/evidence/${submissionId}/${Date.now()}-${safeName}`;
  const { data, error } = await admin.storage.from('assessment-evidence').createSignedUploadUrl(path);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, path, signedUrl: data.signedUrl, token: data.token });
});

router.post('/signed-url', requireAuth, async (req, res) => {
  const schema = z.object({
    bucket: z.enum(['resumes', 'assessment-evidence', 'roadmap-assets', 'profiles']),
    path: z.string().min(1),
    expiresIn: z.number().int().min(30).max(3600).default(300),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const admin = getAdminClient();
  const { data, error } = await admin.storage
    .from(parsed.data.bucket)
    .createSignedUrl(parsed.data.path, parsed.data.expiresIn);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, url: data.signedUrl });
});

router.delete('/object', requireAuth, requireAdmin, adminRateLimit, async (req, res) => {
  const schema = z.object({
    bucket: z.enum(['resumes', 'assessment-evidence', 'roadmap-assets', 'profiles']),
    path: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const admin = getAdminClient();
  const { error } = await admin.storage.from(parsed.data.bucket).remove([parsed.data.path]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

export default router;
