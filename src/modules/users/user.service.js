import * as userRepository from './user.repository.js';
import * as auditService from '../audit/audit.service.js';

export const getUsers = async ({
  page = 1,
  limit = 10,
  role,
  division,
  search,
  sortBy = 'createdAt',
  sortOrder = 'desc',
}) => {
  const skip = (page - 1) * limit;

  const where = {
    deletedAt: null,
    ...(role ? { role } : {}),
    ...(division ? { division } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [users, totalItems] = await Promise.all([
    userRepository.findUsers({ skip, take: limit, where, sortBy, sortOrder }),
    userRepository.countUsers(where),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return {
    users,
    meta: {
      page,
      limit,
      totalItems,
      totalPages,
    },
  };
};

export const updateUserRole = async ({
  actorId,
  targetId,
  role,
  ipAddress,
}) => {
  const targetUser = await userRepository.findUserById(targetId);

  if (!targetUser || targetUser.deletedAt) {
    const err = new Error('User not found or has been deactivated.');
    err.status = 404;
    throw err;
  }

  if (targetUser.role === role) {
    const err = new Error(`User is already assigned the role '${role}'.`);
    err.status = 400;
    throw err;
  }

  const oldValues = { role: targetUser.role };
  const updatedUser = await userRepository.updateUserRole(targetId, role);
  const newValues = { role: updatedUser.role };

  await auditService.log({
    actorId,
    targetId,
    action: 'UPDATE_USER_ROLE',
    oldValues,
    newValues,
    ipAddress,
  });

  return updatedUser;
};

export const deleteUser = async ({ actorId, targetId, ipAddress }) => {
  if (actorId === targetId) {
    const err = new Error('You cannot deactivate your own account.');
    err.status = 400;
    throw err;
  }

  const targetUser = await userRepository.findUserById(targetId);

  if (!targetUser || targetUser.deletedAt) {
    const err = new Error('User not found or has already been deactivated.');
    err.status = 404;
    throw err;
  }

  const oldValues = { deletedAt: targetUser.deletedAt };
  const deletedUser = await userRepository.softDeleteUser(targetId);
  const newValues = { deletedAt: deletedUser.deletedAt };

  await auditService.log({
    actorId,
    targetId,
    action: 'SOFT_DELETE_USER',
    oldValues,
    newValues,
    ipAddress,
  });

  return deletedUser;
};
