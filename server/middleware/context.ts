/**
 * Request context middleware.
 * Captures IP (X-Forwarded-For aware), User-Agent and a parsed Browser name.
 * Attached to req.context so admin/audit handlers can use it.
 *
 * Requires server.ts to set `app.set('trust proxy', 1)` (or higher) so that
 * req.ip reflects the real client behind a proxy / load balancer.
 */
import type { Request, Response, NextFunction } from 'express';

export interface RequestContext {
  ip: string | null;
  userAgent: string | null;
  browser: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      context?: RequestContext;
    }
  }
}

/**
 * Tiny UA → browser regex. Order matters: Edge before Chrome, OPR before Chrome, etc.
 */
export function parseBrowser(ua: string | null | undefined): string {
  if (!ua) return 'Unknown';
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/OPR\/|Opera/i.test(ua)) return 'Opera';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Chrome\//i.test(ua)) return 'Chrome';
  if (/Safari\//i.test(ua)) return 'Safari';
  if (/curl|wget|httpie|postman|insomnia/i.test(ua)) return 'CLI';
  return 'Other';
}

export function attachContext(req: Request, _res: Response, next: NextFunction) {
  const ua = (req.headers['user-agent'] as string | undefined) || null;
  req.context = {
    ip: req.ip || null,
    userAgent: ua,
    browser: parseBrowser(ua),
  };
  next();
}

export function getContext(req: Request): RequestContext {
  return req.context || { ip: null, userAgent: null, browser: 'Unknown' };
}