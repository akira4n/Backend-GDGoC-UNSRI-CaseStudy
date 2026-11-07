import { Router } from 'express';
import * as userController from './user.controller.js';
import { getUsersSchema, updateRoleSchema, userParamSchema } from './user.schema.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/rbac.middleware.js';

const router = Router();

router.get(
  '/',
  authenticate,
  authorizeRoles('LEAD', 'DIVISION_HEAD'),
  validate(getUsersSchema),
  userController.getUsers,
);

router.patch(
  '/:id/role',
  authenticate,
  authorizeRoles('LEAD'),
  validate(updateRoleSchema),
  userController.updateUserRole,
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles('LEAD'),
  validate(userParamSchema),
  userController.deleteUser,
);

export default router;
