import { Router } from 'express';
import * as eventController from './event.controller.js';
import {
  createEventSchema,
  updateEventSchema,
  eventParamSchema,
  getEventsSchema,
} from './event.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/rbac.middleware.js';
import { actionRateLimiter } from '../../middlewares/rate-limit.middleware.js';

const router = Router();

router.get('/', validate(getEventsSchema), eventController.getEvents);
router.get('/:identifier', eventController.getEventDetail);

router.post(
  '/',
  authenticate,
  authorizeRoles('LEAD', 'DIVISION_HEAD'),
  validate(createEventSchema),
  eventController.createEvent,
);

router.patch(
  '/:id',
  authenticate,
  authorizeRoles('LEAD', 'DIVISION_HEAD'),
  validate(updateEventSchema),
  eventController.updateEvent,
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles('LEAD', 'DIVISION_HEAD'),
  validate(eventParamSchema),
  eventController.deleteEvent,
);

router.post(
  '/:id/register',
  authenticate,
  actionRateLimiter,
  validate(eventParamSchema),
  eventController.registerEvent,
);

export default router;
