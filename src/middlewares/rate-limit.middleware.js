import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 3 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    const err = new Error('Too many attempts. Please try again later.');
    err.status = 429;
    next(err);
  },
});
