import prisma from '../../config/database.js';

export const createAuditLog = (data) =>
  prisma.auditLog.create({
    data,
  });

export const findAuditLogs = ({ skip, take, where }) =>
  prisma.auditLog.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: 'desc' },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

export const countAuditLogs = (where) => prisma.auditLog.count({ where });
