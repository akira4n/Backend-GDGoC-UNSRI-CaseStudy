import prisma from '../config/database.js';
import { verifyToken } from '../utils/jwt.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const err = new Error('Authentication token is missing.');
      err.status = 401;
      return next(err);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        division: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      const err = new Error(
        'Account has been deactivated or no longer exists.',
      );
      err.status = 401;
      return next(err);
    }

    req.user = user;
    next();
  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError' ||
      error.name === 'NotBeforeError'
    ) {
      const err = new Error('Invalid or expired token.');
      err.status = 401;
      return next(err);
    }

    next(error);
  }
};
