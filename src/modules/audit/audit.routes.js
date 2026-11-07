import { Router } from 'express';
import * as auditController from './audit.controller.js';
import { getAuditLogsSchema } from './audit.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/rbac.middleware.js';

const router = Router();

router.get(
  '/',
  authenticate,
  authorizeRoles('LEAD'),
  validate(getAuditLogsSchema),
  auditController.getAuditLogs,
);

export default router;
