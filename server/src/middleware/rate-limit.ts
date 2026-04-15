import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error:
      'Too many requests in a short window. Wait a moment and try again.',
    code: 'rate_limited',
  },
});

export const heavyLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error:
      'Voice cloning and instruction generation are limited to 5 requests per minute. Wait a moment and try again.',
    code: 'rate_limited',
  },
});
