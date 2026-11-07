import { Router } from 'express';
import * as attendanceController from './attendance.controller.js';
import { checkInSchema } from './attendance.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { actionRateLimiter } from '../../middlewares/rate-limit.middleware.js';

const router = Router();

router.post(
  '/:eventId/check-in',
  authenticate,
  actionRateLimiter,
  validate(checkInSchema),
  attendanceController.checkIn,
);

export default router;
