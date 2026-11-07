import * as eventRepository from './event.repository.js';
import * as auditService from '../audit/audit.service.js';

const generateSlug = (title) => {
  const baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${baseSlug}-${Date.now().toString(36)}`;
};

export const createEvent = async ({
  title,
  description,
  quota,
  startTime,
  endTime,
  createdBy,
}) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (start >= end) {
    const err = new Error('End time must be later than start time.');
    err.status = 400;
    throw err;
  }

  const slug = generateSlug(title);

  return await eventRepository.createEvent({
    title,
    slug,
    description: description || null,
    quota,
    startTime: start,
    endTime: end,
    createdBy,
  });
};

export const getEvents = async ({
  page = 1,
  limit = 10,
  search,
  sortBy = 'startTime',
  sortOrder = 'asc',
}) => {
  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [events, totalItems] = await Promise.all([
    eventRepository.findEvents({ skip, take: limit, where, sortBy, sortOrder }),
    eventRepository.countEvents(where),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return {
    events,
    meta: {
      page,
      limit,
      totalItems,
      totalPages,
    },
  };
};

export const getEventByIdOrSlug = async (identifier) => {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      identifier,
    );

  const event = isUuid
    ? await eventRepository.findEventById(identifier)
    : await eventRepository.findEventBySlug(identifier);

  if (!event) {
    const err = new Error('Event not found.');
    err.status = 404;
    throw err;
  }

  return event;
};

export const updateEvent = async ({
  id,
  payload,
  actorId,
  ipAddress,
}) => {
  const existingEvent = await eventRepository.findEventById(id);
  if (!existingEvent) {
    const err = new Error('Event not found.');
    err.status = 404;
    throw err;
  }

  const dataToUpdate = { ...payload };

  if (payload.startTime) dataToUpdate.startTime = new Date(payload.startTime);
  if (payload.endTime) dataToUpdate.endTime = new Date(payload.endTime);

  const start = dataToUpdate.startTime || existingEvent.startTime;
  const end = dataToUpdate.endTime || existingEvent.endTime;

  if (start >= end) {
    const err = new Error('End time must be later than start time.');
    err.status = 400;
    throw err;
  }

  if (payload.title && payload.title !== existingEvent.title) {
    dataToUpdate.slug = generateSlug(payload.title);
  }

  const updatedEvent = await eventRepository.updateEvent(id, dataToUpdate);

  // SRS Audit Requirement: Trigger audit log on manual quota modification
  if (payload.quota !== undefined && payload.quota !== existingEvent.quota) {
    await auditService.log({
      actorId,
      targetId: id,
      action: 'UPDATE_EVENT_QUOTA',
      oldValues: { quota: existingEvent.quota },
      newValues: { quota: payload.quota },
      ipAddress,
    });
  }

  return updatedEvent;
};

export const deleteEvent = async ({ id, actorId, ipAddress }) => {
  const existingEvent = await eventRepository.findEventById(id);
  if (!existingEvent) {
    const err = new Error('Event not found.');
    err.status = 404;
    throw err;
  }

  await eventRepository.deleteEvent(id);

  if (actorId) {
    await auditService.log({
      actorId,
      targetId: id,
      action: 'DELETE_EVENT',
      oldValues: {
        title: existingEvent.title,
        slug: existingEvent.slug,
        quota: existingEvent.quota,
        registeredCount: existingEvent.registeredCount,
        startTime: existingEvent.startTime,
        endTime: existingEvent.endTime,
      },
      newValues: null,
      ipAddress,
    });
  }
};

export const registerForEvent = async (eventId, userId) => {
  const event = await eventRepository.findEventById(eventId);
  if (!event) {
    const err = new Error('Event not found.');
    err.status = 404;
    throw err;
  }

  return await eventRepository.registerUserAtomic(eventId, userId);
};
