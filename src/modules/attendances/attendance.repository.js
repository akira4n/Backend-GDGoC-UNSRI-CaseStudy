import prisma from '../../config/database.js';

export const findAttendance = (eventId, userId) =>
  prisma.attendance.findUnique({
    where: {
      eventId_userId: {
        eventId,
        userId,
      },
    },
  });

export const createAttendance = (eventId, userId) =>
  prisma.attendance.create({
    data: {
      eventId,
      userId,
    },
  });
