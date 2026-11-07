import * as userService from './user.service.js';

export const getUsers = async (req, res, next) => {
  try {
    const result = await userService.getUsers(req.query);

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully.',
      data: result.users,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const actorId = req.user.id;
    const targetId = req.params.id;
    const { role } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    const user = await userService.updateUserRole({
      actorId,
      targetId,
      role,
      ipAddress,
    });

    res.status(200).json({
      success: true,
      message: 'User role updated successfully.',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const actorId = req.user.id;
    const targetId = req.params.id;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    await userService.deleteUser({ actorId, targetId, ipAddress });

    res.status(200).json({
      success: true,
      message: 'User account deactivated successfully.',
    });
  } catch (error) {
    next(error);
  }
};
