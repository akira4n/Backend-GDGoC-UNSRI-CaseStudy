import * as eventService from './event.service.js';

export const createEvent = async (req, res, next) => {
  try {
    const createdBy = req.user.id;
    const event = await eventService.createEvent({
      ...req.body,
      createdBy,
    });

    res.status(201).json({
      success: true,
      message: 'Event created successfully.',
      data: { event },
    });
  } catch (error) {
    next(error);
  }
};

export const getEvents = async (req, res, next) => {
  try {
    const result = await eventService.getEvents(req.query);

    res.status(200).json({
      success: true,
      message: 'Events retrieved successfully.',
      data: result.events,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

export const getEventDetail = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const event = await eventService.getEventByIdOrSlug(identifier);

    res.status(200).json({
      success: true,
      message: 'Event details retrieved successfully.',
      data: { event },
    });
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorId = req.user.id;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    const event = await eventService.updateEvent({
      id,
      payload: req.body,
      actorId,
      ipAddress,
    });

    res.status(200).json({
      success: true,
      message: 'Event updated successfully.',
      data: { event },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorId = req.user.id;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    await eventService.deleteEvent({ id, actorId, ipAddress });

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const registerEvent = async (req, res, next) => {
  try {
    const { id: eventId } = req.params;
    const userId = req.user.id;

    const registration = await eventService.registerForEvent(eventId, userId);

    res.status(201).json({
      success: true,
      message: 'Registered for event successfully.',
      data: { registration },
    });
  } catch (error) {
    next(error);
  }
};
