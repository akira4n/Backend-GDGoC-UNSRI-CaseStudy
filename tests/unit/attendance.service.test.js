import { jest } from '@jest/globals';

const mockFindEventById = jest.fn();
const mockFindRegistration = jest.fn();
const mockFindAttendance = jest.fn();
const mockCreateAttendance = jest.fn();

jest.unstable_mockModule('../../src/modules/events/event.repository.js', () => ({
  findEventById: mockFindEventById,
  findRegistration: mockFindRegistration,
}));

jest.unstable_mockModule('../../src/modules/attendances/attendance.repository.js', () => ({
  findAttendance: mockFindAttendance,
  createAttendance: mockCreateAttendance,
}));

const attendanceService = await import('../../src/modules/attendances/attendance.service.js');

describe('Attendance Service (Unit Test)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const eventId = 'event-uuid-1';
  const userId = 'user-uuid-1';

  it('should throw HTTP 404 if event is not found', async () => {
    mockFindEventById.mockResolvedValue(null);

    await expect(
      attendanceService.checkIn({ eventId, userId }),
    ).rejects.toMatchObject({
      message: 'Event not found.',
      status: 404,
    });
  });

  it('should throw HTTP 400 if current time is before event start time', async () => {
    const futureStart = new Date(Date.now() + 1000 * 60 * 60);
    const futureEnd = new Date(Date.now() + 1000 * 60 * 120);

    mockFindEventById.mockResolvedValue({
      id: eventId,
      startTime: futureStart,
      endTime: futureEnd,
    });

    await expect(
      attendanceService.checkIn({ eventId, userId }),
    ).rejects.toMatchObject({
      message: 'Attendance check-in window is not active.',
      status: 400,
    });
  });

  it('should throw HTTP 400 if current time is after event end time', async () => {
    const pastStart = new Date(Date.now() - 1000 * 60 * 120);
    const pastEnd = new Date(Date.now() - 1000 * 60 * 60);

    mockFindEventById.mockResolvedValue({
      id: eventId,
      startTime: pastStart,
      endTime: pastEnd,
    });

    await expect(
      attendanceService.checkIn({ eventId, userId }),
    ).rejects.toMatchObject({
      message: 'Attendance check-in window is not active.',
      status: 400,
    });
  });

  it('should throw HTTP 403 if user is not registered for the event', async () => {
    const activeStart = new Date(Date.now() - 1000 * 60 * 30);
    const activeEnd = new Date(Date.now() + 1000 * 60 * 30);

    mockFindEventById.mockResolvedValue({
      id: eventId,
      startTime: activeStart,
      endTime: activeEnd,
    });
    mockFindRegistration.mockResolvedValue(null);

    await expect(
      attendanceService.checkIn({ eventId, userId }),
    ).rejects.toMatchObject({
      message: 'You are not registered for this event.',
      status: 403,
    });
  });

  it('should return isAlreadyCheckedIn: true on fast-path if attendance already exists', async () => {
    const activeStart = new Date(Date.now() - 1000 * 60 * 30);
    const activeEnd = new Date(Date.now() + 1000 * 60 * 30);

    mockFindEventById.mockResolvedValue({
      id: eventId,
      startTime: activeStart,
      endTime: activeEnd,
    });
    mockFindRegistration.mockResolvedValue({ id: 'reg-1', eventId, userId });
    mockFindAttendance.mockResolvedValue({
      id: 'att-existing',
      eventId,
      userId,
      checkedInAt: new Date(),
    });

    const result = await attendanceService.checkIn({ eventId, userId });

    expect(result.isAlreadyCheckedIn).toBe(true);
    expect(result.attendance.id).toBe('att-existing');
    expect(mockCreateAttendance).not.toHaveBeenCalled();
  });

  it('should create new attendance and return isAlreadyCheckedIn: false on first check-in', async () => {
    const activeStart = new Date(Date.now() - 1000 * 60 * 30);
    const activeEnd = new Date(Date.now() + 1000 * 60 * 30);

    mockFindEventById.mockResolvedValue({
      id: eventId,
      startTime: activeStart,
      endTime: activeEnd,
    });
    mockFindRegistration.mockResolvedValue({ id: 'reg-1', eventId, userId });
    mockFindAttendance.mockResolvedValue(null);
    mockCreateAttendance.mockResolvedValue({
      id: 'att-new',
      eventId,
      userId,
      checkedInAt: new Date(),
    });

    const result = await attendanceService.checkIn({ eventId, userId });

    expect(result.isAlreadyCheckedIn).toBe(false);
    expect(result.attendance.id).toBe('att-new');
    expect(mockCreateAttendance).toHaveBeenCalledWith(eventId, userId);
  });

  it('should catch P2002 concurrency error and return isAlreadyCheckedIn: true with existing record', async () => {
    const activeStart = new Date(Date.now() - 1000 * 60 * 30);
    const activeEnd = new Date(Date.now() + 1000 * 60 * 30);

    mockFindEventById.mockResolvedValue({
      id: eventId,
      startTime: activeStart,
      endTime: activeEnd,
    });
    mockFindRegistration.mockResolvedValue({ id: 'reg-1', eventId, userId });
    // First findAttendance returns null (concurrent race)
    mockFindAttendance.mockResolvedValueOnce(null);
    // Create throws P2002
    const p2002Error = new Error('Unique constraint failed');
    p2002Error.code = 'P2002';
    mockCreateAttendance.mockRejectedValue(p2002Error);
    // Second findAttendance returns the record created by concurrent sibling
    mockFindAttendance.mockResolvedValueOnce({
      id: 'att-sibling',
      eventId,
      userId,
      checkedInAt: new Date(),
    });

    const result = await attendanceService.checkIn({ eventId, userId });

    expect(result.isAlreadyCheckedIn).toBe(true);
    expect(result.attendance.id).toBe('att-sibling');
  });
});
