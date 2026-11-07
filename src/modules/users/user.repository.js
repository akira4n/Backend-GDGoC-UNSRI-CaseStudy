import prisma from '../../config/database.js';

export const findUsers = ({
  skip,
  take,
  where,
  sortBy = 'createdAt',
  sortOrder = 'desc',
}) =>
  prisma.user.findMany({
    where,
    skip,
    take,
    orderBy: { [sortBy]: sortOrder },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      division: true,
      createdAt: true,
      updatedAt: true,
    },
  });

export const countUsers = (where) => prisma.user.count({ where });

export const findUserById = (id) =>
  prisma.user.findUnique({
    where: { id },
  });

export const updateUserRole = (id, role) =>
  prisma.user.update({
    where: { id },
    data: { role },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      division: true,
      updatedAt: true,
    },
  });

export const softDeleteUser = (id) =>
  prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
    select: {
      id: true,
      name: true,
      email: true,
      deletedAt: true,
    },
  });
