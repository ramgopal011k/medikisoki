import { Request, Response, NextFunction } from 'express';

const DEMO_AUTH_TOKEN = process.env.DEMO_AUTH_TOKEN || 'medikiosk-demo-token';

export function verifyAuth(req: Request, res: Response, next: NextFunction) {
  // Allow public health, auth, and read-only hospital listing routes
  const path = req.path;
  const originalUrl = req.originalUrl || req.url || '';
  
  const isPublic =
    path === '/health' ||
    originalUrl.includes('/health') ||
    path === '/auth/login' ||
    originalUrl.includes('/auth/login') ||
    path === '/auth/register' ||
    originalUrl.includes('/auth/register') ||
    (req.method === 'GET' && (path === '/hospitals' || originalUrl.includes('/hospitals')));

  if (isPublic) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized: Missing Authorization header' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({ error: 'Unauthorized: Format must be Bearer <token>' });
  }

  const token = parts[1];

  // Verify against DEMO_AUTH_TOKEN, mock doctor/superadmin tokens, or issued doctor tokens
  const isValid =
    token === DEMO_AUTH_TOKEN ||
    token === 'mock-doctor-token' ||
    token === 'mock-superadmin-token' ||
    token.startsWith('token-') ||
    token.startsWith('demo-');

  if (!isValid) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  (req as any).authToken = token;
  next();
}
