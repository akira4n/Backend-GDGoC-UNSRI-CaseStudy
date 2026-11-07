import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';
import { hashPassword } from '../../src/utils/password.js';

describe('Attendance Integration Test', () => {
  let leadToken;
  let memberToken;
  let memberId;
  let activeEventId;
  let futureEventId;
  let pastEventId;

  beforeAll(async () => {
    // 1. Login as Lead
    const leadLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'lead@gdgoc-unsri.org', password: 'password123' });
    leadToken = leadLogin.body.data.token;

    // 2. Create test member
    const hashedPassword = await hashPassword('password123');
    const memberEmail = `attendance.tester.${Date.now()}@test.local`;
    const memberUser = await prisma.user.create({
      data: {
        name: 'Attendance Tester',
        email: memberEmail,
        password: hashedPassword,
        role: 'MEMBER',
      },
    });
    memberId = memberUser.id;

    const memberLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: memberEmail, password: 'password123' });
    memberToken = memberLogin.body.data.token;

    // 3. Create active event (now between start and end)
    const now = Date.now();
    const activeRes = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${leadToken}`)
      .send({
        title: `Active Attendance Event ${now}`,
        description: 'Currently active event',
        quota: 50,
        startTime: new Date(now - 1000 * 60 * 30).toISOString(),
        endTime: new Date(now + 1000 * 60 * 30).toISOString(),
      });
    activeEventId = activeRes.body.data.event.id;

    // 4. Create future event (starts in 1 hr)
    const futureRes = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${leadToken}`)
      .send({
        title: `Future Event ${now}`,
        quota: 50,
        startTime: new Date(now + 1000 * 60 * 60).toISOString(),
        endTime: new Date(now + 1000 * 60 * 120).toISOString(),
      });
    futureEventId = futureRes.body.data.event.id;

    // 5. Create past event directly in DB (to bypass creation validation startTime < endTime in past)
    const pastEvent = await prisma.event.create({
      data: {
        title: `Past Event ${now}`,
        slug: `past-event-${now}`,
        quota: 50,
        registeredCount: 0,
        startTime: new Date(now - 1000 * 60 * 120),
        endTime: new Date(now - 1000 * 60 * 60),
        createdBy: memberId,
      },
    });
    pastEventId = pastEvent.id;
  });

  afterAll(async () => {
    // Teardown
    const eventIds = [activeEventId, futureEventId, pastEventId].filter(Boolean);
    for (const id of eventIds) {
      await prisma.attendance.deleteMany({ where: { eventId: id } });
      await prisma.eventRegistration.deleteMany({ where: { eventId: id } });
      await prisma.event.delete({ where: { id } }).catch(() => {});
    }
    await prisma.user.deleteMany({ where: { email: { contains: '@test.local' } } });
    await prisma.$disconnect();
  });

  describe('Time Window Validation', () => {
    it('should reject check-in if event has not started yet (HTTP 400)', async () => {
      const res = await request(app)
        .post(`/api/v1/attendances/${futureEventId}/check-in`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Attendance check-in window is not active.');
    });

    it('should reject check-in if event has already ended (HTTP 400)', async () => {
      const res = await request(app)
        .post(`/api/v1/attendances/${pastEventId}/check-in`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Attendance check-in window is not active.');
    });
  });

  describe('Registration Enforcement', () => {
    it('should reject check-in if user is not registered for the event (HTTP 403)', async () => {
      const res = await request(app)
        .post(`/api/v1/attendances/${activeEventId}/check-in`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('You are not registered for this event.');
    });
  });

  describe('Idempotent Check-in Flow', () => {
    let firstAttendanceId;

    it('should record attendance successfully on first valid check-in (HTTP 200)', async () => {
      // First, register the member for the active event
      const regRes = await request(app)
        .post(`/api/v1/events/${activeEventId}/register`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(regRes.status).toBe(201);

      // Perform first check-in
      const checkInRes = await request(app)
        .post(`/api/v1/attendances/${activeEventId}/check-in`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(checkInRes.status).toBe(200);
      expect(checkInRes.body.success).toBe(true);
      expect(checkInRes.body.message).toBe('Attendance recorded successfully.');
      expect(checkInRes.body.data.id).toBeDefined();

      firstAttendanceId = checkInRes.body.data.id;
    });

    it('should be idempotent: subsequent check-in returns HTTP 200 with the exact same attendance record', async () => {
      const secondCheckInRes = await request(app)
        .post(`/api/v1/attendances/${activeEventId}/check-in`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(secondCheckInRes.status).toBe(200);
      expect(secondCheckInRes.body.success).toBe(true);
      expect(secondCheckInRes.body.message).toBe('Already checked in for this event.');
      // IDs must match exactly!
      expect(secondCheckInRes.body.data.id).toBe(firstAttendanceId);

      // Verify that attendance rows in database did not duplicate (count === 1)
      const count = await prisma.attendance.count({
        where: {
          eventId: activeEventId,
          userId: memberId,
        },
      });
      expect(count).toBe(1);
    });
  });
});
