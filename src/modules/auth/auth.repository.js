import prisma from '../../config/database.js';

export const findUserByEmail = (email) =>
  prisma.user.findUnique({
    where: { email },
  });

export const createUser = (data) =>
  prisma.user.create({
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      division: true,
      createdAt: true,
    },
  });
