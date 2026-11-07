import { ZodError } from 'zod';
import { logger } from '../config/logger.js';

export const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Internal Server Error.';

  if (err instanceof ZodError) {
    status = 400;
    message = err.issues?.[0]?.message || 'Invalid request payload.';
  } else if (err.code === 'P2002') {
    status = 409;
    message = 'Resource already exists or violates unique constraint.';
  }

  if (status >= 500) {
    logger.error(err);
    message = 'Internal Server Error.';
  }

  res.status(status).json({
    success: false,
    message,
  });
};
