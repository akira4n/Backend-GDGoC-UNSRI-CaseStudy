import { Router } from 'express';
import * as authController from './auth.controller.js';
import { registerSchema, loginSchema } from './auth.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authRateLimiter } from '../../middlewares/rate-limit.middleware.js';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  authController.login,
);

export default router;
