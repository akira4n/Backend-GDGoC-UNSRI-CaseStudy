import rateLimit from 'express-rate-limit';

const isTestEnv = () => process.env.NODE_ENV === 'test';

export const globalRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 60,
  skip: (req) => isTestEnv() && !req.headers['x-test-rate-limit'],
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    const err = new Error('Too many requests. Please slow down.');
    err.status = 429;
    next(err);
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 3 * 60 * 1000,
  limit: 5,
  skip: (req) => isTestEnv() && !req.headers['x-test-rate-limit'],
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    const err = new Error('Too many attempts. Please try again later.');
    err.status = 429;
    next(err);
  },
});

export const actionRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 10,
  skip: (req) => isTestEnv() && !req.headers['x-test-rate-limit'],
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    const err = new Error('Too many action requests. Please try again shortly.');
    err.status = 429;
    next(err);
  },
});

