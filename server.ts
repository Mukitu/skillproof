import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import aiRoutes from './server/routes/ai.js';
import adminRoutes from './server/routes/admin.js';
import storageRoutes from './server/routes/storage.js';
import ogRoutes from './server/routes/og.js';
import governanceRoutes from './server/routes/governance.js';

const app = express();
// Trust the first proxy hop so req.ip is the real client (X-Forwarded-For aware).
// Required for accurate audit logging.
app.set('trust proxy', 1);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

// Production security headers. CSP is disabled in dev because Vite injects inline HMR code.
app.use(helmet({
  contentSecurityPolicy: isProduction,
  crossOriginEmbedderPolicy: false,
}));

// CORS allow-list.
app.use((req, res, next) => {
  const allowedOrigin = process.env.CORS_ORIGIN || (isProduction ? '' : '*');
  const origin = req.headers.origin || '';
  if (allowedOrigin === '*' || (allowedOrigin && origin === allowedOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin === '*' ? '*' : origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: false, limit: '15mb' }));

// Attach { ip, userAgent, browser } to req.context (used by audit logging).
// Use static import: context.ts has no async deps.
import { attachContext } from './server/middleware/context.js';
app.use(attachContext);

// Liveness — does not disclose config or secrets.
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'SkillProof Backend API', timestamp: new Date().toISOString() });
});

// API routes.
app.use('/api', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/og', ogRoutes);
app.use('/api/governance', governanceRoutes);

// 404 for unknown API routes, before SPA fallback.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

async function startServer() {
  // Validate server-only production secrets before accepting traffic.
  if (isProduction) {
    const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GROQ_API_KEY', 'CORS_ORIGIN'];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length) {
      throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
    }
  }

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SkillProof Backend] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SkillProof Backend] Fatal startup error:', err);
  process.exit(1);
});
