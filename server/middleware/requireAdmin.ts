/**
 * Admin authorization middleware.
 */
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from './auth.js';

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.profile || !['admin', 'super_admin'].includes(req.profile.role)) {
    return res.status(403).json({ error: 'Admin role required' });
  }
  next();
}
