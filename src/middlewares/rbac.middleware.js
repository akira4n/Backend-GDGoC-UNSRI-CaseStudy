export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      const err = new Error('Not authenticated.');
      err.status = 401;
      return next(err);
    }

    if (!allowedRoles.includes(req.user.role)) {
      const err = new Error('Forbidden.');
      err.status = 403;
      return next(err);
    }

    next();
  };
};
