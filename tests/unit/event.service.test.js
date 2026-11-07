import { jest } from '@jest/globals';

const mockCreateEvent = jest.fn();
const mockFindEvents = jest.fn();
const mockCountEvents = jest.fn();
const mockFindEventById = jest.fn();
const mockFindEventBySlug = jest.fn();
const mockUpdateEvent = jest.fn();
const mockDeleteEvent = jest.fn();
const mockRegisterUserAtomic = jest.fn();
const mockAuditLog = jest.fn();

jest.unstable_mockModule('../../src/modules/events/event.repository.js', () => ({
  createEvent: mockCreateEvent,
  findEvents: mockFindEvents,
  countEvents: mockCountEvents,
  findEventById: mockFindEventById,
  findEventBySlug: mockFindEventBySlug,
  updateEvent: mockUpdateEvent,
  deleteEvent: mockDeleteEvent,
  registerUserAtomic: mockRegisterUserAtomic,
}));

jest.unstable_mockModule('../../src/modules/audit/audit.service.js', () => ({
  log: mockAuditLog,
}));

const eventService = await import('../../src/modules/events/event.service.js');

describe('Event Service (Unit Test)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEvent', () => {
    it('should create an event with auto-generated slug when time range is valid', async () => {
      const startTime = new Date(Date.now() + 1000 * 60 * 60).toISOString();
      const endTime = new Date(Date.now() + 1000 * 60 * 120).toISOString();

      mockCreateEvent.mockResolvedValue({
        id: 'event-uuid-1',
        title: 'Cloud Study Jam',
        slug: 'cloud-study-jam-xyz',
        quota: 50,
        registeredCount: 0,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      });

      const result = await eventService.createEvent({
        title: 'Cloud Study Jam',
        description: 'Hands-on session',
        quota: 50,
        startTime,
        endTime,
        createdBy: 'user-uuid-1',
      });

      expect(mockCreateEvent).toHaveBeenCalled();
      expect(result.id).toBe('event-uuid-1');
      expect(result.title).toBe('Cloud Study Jam');
    });

    it('should throw HTTP 400 if start time is later than or equal to end time', async () => {
      const startTime = '2026-12-01T12:00:00Z';
      const endTime = '2026-12-01T10:00:00Z';

      await expect(
        eventService.createEvent({
          title: 'Invalid Event',
          quota: 20,
          startTime,
          endTime,
          createdBy: 'user-uuid-1',
        }),
      ).rejects.toMatchObject({
        message: 'End time must be later than start time.',
        status: 400,
      });
    });
  });

  describe('getEvents', () => {
    it('should return paginated events with metadata', async () => {
      mockFindEvents.mockResolvedValue([{ id: 'event-1' }, { id: 'event-2' }]);
      mockCountEvents.mockResolvedValue(2);

      const result = await eventService.getEvents({ page: 1, limit: 10 });

      expect(result.events.length).toBe(2);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        totalItems: 2,
        totalPages: 1,
      });
    });
  });

  describe('getEventByIdOrSlug', () => {
    it('should lookup by ID if identifier is a valid UUID', async () => {
      const validUuid = '11111111-2222-3333-4444-555555555555';
      mockFindEventById.mockResolvedValue({ id: validUuid, title: 'Sample' });

      const result = await eventService.getEventByIdOrSlug(validUuid);

      expect(mockFindEventById).toHaveBeenCalledWith(validUuid);
      expect(result.id).toBe(validUuid);
    });

    it('should lookup by slug if identifier is a slug string', async () => {
      mockFindEventBySlug.mockResolvedValue({ id: 'uuid-1', slug: 'my-event' });

      const result = await eventService.getEventByIdOrSlug('my-event');

      expect(mockFindEventBySlug).toHaveBeenCalledWith('my-event');
      expect(result.slug).toBe('my-event');
    });

    it('should throw HTTP 404 if event is not found', async () => {
      mockFindEventById.mockResolvedValue(null);

      await expect(
        eventService.getEventByIdOrSlug('11111111-2222-3333-4444-555555555555'),
      ).rejects.toMatchObject({
        message: 'Event not found.',
        status: 404,
      });
    });
  });

  describe('updateEvent', () => {
    it('should update event and trigger audit log if quota is changed', async () => {
      const eventId = 'event-uuid-1';
      mockFindEventById.mockResolvedValue({
        id: eventId,
        quota: 30,
        startTime: new Date('2026-12-01T09:00:00Z'),
        endTime: new Date('2026-12-01T12:00:00Z'),
      });
      mockUpdateEvent.mockResolvedValue({
        id: eventId,
        quota: 50,
      });

      const result = await eventService.updateEvent({
        id: eventId,
        payload: { quota: 50 },
        actorId: 'admin-uuid',
        ipAddress: '127.0.0.1',
      });

      expect(mockUpdateEvent).toHaveBeenCalledWith(eventId, expect.objectContaining({ quota: 50 }));
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE_EVENT_QUOTA',
          oldValues: { quota: 30 },
          newValues: { quota: 50 },
        }),
      );
      expect(result.quota).toBe(50);
    });

    it('should not trigger audit log if quota is unchanged', async () => {
      const eventId = 'event-uuid-1';
      mockFindEventById.mockResolvedValue({
        id: eventId,
        quota: 30,
        title: 'Old Title',
        startTime: new Date('2026-12-01T09:00:00Z'),
        endTime: new Date('2026-12-01T12:00:00Z'),
      });
      mockUpdateEvent.mockResolvedValue({ id: eventId, title: 'New Title' });

      await eventService.updateEvent({
        id: eventId,
        payload: { title: 'New Title' },
        actorId: 'admin-uuid',
        ipAddress: '127.0.0.1',
      });

      expect(mockAuditLog).not.toHaveBeenCalled();
    });
  });

  describe('deleteEvent', () => {
    it('should delete event and record DELETE_EVENT audit log with snapshot', async () => {
      const eventId = 'event-uuid-1';
      mockFindEventById.mockResolvedValue({
        id: eventId,
        title: 'Event To Delete',
        slug: 'event-to-delete',
        quota: 50,
        registeredCount: 5,
        startTime: new Date('2026-12-01T09:00:00Z'),
        endTime: new Date('2026-12-01T12:00:00Z'),
      });

      await eventService.deleteEvent({
        id: eventId,
        actorId: 'admin-uuid',
        ipAddress: '127.0.0.1',
      });

      expect(mockDeleteEvent).toHaveBeenCalledWith(eventId);
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE_EVENT',
          targetId: eventId,
          oldValues: expect.objectContaining({ title: 'Event To Delete' }),
        }),
      );
    });

    it('should throw HTTP 404 if event to delete is not found', async () => {
      mockFindEventById.mockResolvedValue(null);

      await expect(
        eventService.deleteEvent({ id: 'non-existing' }),
      ).rejects.toMatchObject({
        message: 'Event not found.',
        status: 404,
      });
    });
  });

  describe('registerForEvent', () => {
    it('should trigger registerUserAtomic when event exists', async () => {
      mockFindEventById.mockResolvedValue({ id: 'event-1' });
      mockRegisterUserAtomic.mockResolvedValue({ id: 'reg-1', eventId: 'event-1', userId: 'user-1' });

      const result = await eventService.registerForEvent('event-1', 'user-1');

      expect(mockRegisterUserAtomic).toHaveBeenCalledWith('event-1', 'user-1');
      expect(result.id).toBe('reg-1');
    });

    it('should throw HTTP 404 if event does not exist', async () => {
      mockFindEventById.mockResolvedValue(null);

      await expect(
        eventService.registerForEvent('non-existing', 'user-1'),
      ).rejects.toMatchObject({
        message: 'Event not found.',
        status: 404,
      });
    });
  });
});
