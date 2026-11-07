import { Router } from 'express';
import * as attendanceController from './attendance.controller.js';
import { checkInSchema } from './attendance.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.post(
  '/:eventId/check-in',
  authenticate,
  validate(checkInSchema),
  attendanceController.checkIn,
);

export default router;
