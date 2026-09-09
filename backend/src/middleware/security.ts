import { Request, Response, NextFunction } from 'express';

// Security Headers Middleware
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src *"
  );
  next();
}

// In-Memory Rate Limiter
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(options: { windowMs: number; max: number; message?: string }) {
  const ipMap = new Map<string, RateLimitRecord>();
  const windowMs = options.windowMs;
  const max = options.max;
  const message = options.message || 'Too many requests, please try again later.';

  // Periodically clean expired entries
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipMap.entries()) {
      if (now > record.resetTime) {
        ipMap.delete(ip);
      }
    }
  }, Math.max(windowMs, 60000)).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = ipMap.get(ip);

    if (!record || now > record.resetTime) {
      ipMap.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    record.count++;
    if (record.count > max) {
      return res.status(429).json({ error: message });
    }
    next();
  };
}

// Strip Prompt Injection patterns
export function sanitizePromptInput(input: any): any {
  if (typeof input === 'string') {
    let sanitized = input.slice(0, 4000); // Safe length cap
    // Strip special tokens & adversarial prompt overrides
    sanitized = sanitized.replace(/<\|im_start\|>|<\|im_end\|>|\[INST\]|\[\/INST\]|```/gi, '');
    sanitized = sanitized.replace(/\b(ignore (all )?(previous|prior) instructions|disregard previous commands)\b/gi, '[FILTERED]');
    return sanitized;
  }
  if (Array.isArray(input)) {
    return input.map(sanitizePromptInput);
  }
  if (input !== null && typeof input === 'object') {
    const sanitizedObj: Record<string, any> = {};
    for (const [key, val] of Object.entries(input)) {
      sanitizedObj[key] = sanitizePromptInput(val);
    }
    return sanitizedObj;
  }
  return input;
}
