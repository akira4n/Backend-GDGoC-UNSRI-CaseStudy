import prisma from '../../config/database.js';

export const createEvent = (data) =>
  prisma.event.create({
    data,
  });

export const findEvents = ({
  skip,
  take,
  where,
  sortBy = 'startTime',
  sortOrder = 'asc',
}) =>
  prisma.event.findMany({
    where,
    skip,
    take,
    orderBy: { [sortBy]: sortOrder },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          division: true,
        },
      },
    },
  });

export const countEvents = (where) => prisma.event.count({ where });

export const findEventById = (id) =>
  prisma.event.findUnique({
    where: { id },
  });

export const findEventBySlug = (slug) =>
  prisma.event.findUnique({
    where: { slug },
  });

export const updateEvent = (id, data) =>
  prisma.event.update({
    where: { id },
    data,
  });

export const deleteEvent = (id) =>
  prisma.event.delete({
    where: { id },
  });

export const findRegistration = (eventId, userId) =>
  prisma.eventRegistration.findUnique({
    where: {
      eventId_userId: {
        eventId,
        userId,
      },
    },
  });

export const registerUserAtomic = async (eventId, userId) => {
  return await prisma.$transaction(async (tx) => {
    const existingRegistration = await tx.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    if (existingRegistration) {
      const err = new Error('You are already registered for this event.');
      err.status = 409;
      throw err;
    }

    const affectedRows = await tx.$executeRaw`
      UPDATE events 
      SET registered_count = registered_count + 1 
      WHERE id = ${eventId}::uuid 
        AND registered_count < quota
    `;

    if (affectedRows === 0) {
      const err = new Error('Event quota is full or event does not exist.');
      err.status = 409;
      throw err;
    }

    const registration = await tx.eventRegistration.create({
      data: {
        eventId,
        userId,
      },
    });

    return registration;
  });
};
