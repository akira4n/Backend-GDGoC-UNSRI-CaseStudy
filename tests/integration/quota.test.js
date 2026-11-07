import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';
import { hashPassword } from '../../src/utils/password.js';

describe('Quota Concurrency Integration Test', () => {
  let leadToken;
  let testEventId;
  const dummyUsers = [];
  const dummyTokens = [];

  beforeAll(async () => {
    // 1. Login as Lead to create test event
    const leadLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'lead@gdgoc-unsri.org', password: 'password123' });
    leadToken = leadLogin.body.data.token;

    // 2. Create 5 test members with unique emails
    const hashedPassword = await hashPassword('password123');
    for (let i = 1; i <= 5; i++) {
      const email = `quota.runner.${Date.now()}.${i}@test.local`;
      const user = await prisma.user.create({
        data: {
          name: `Quota Runner ${i}`,
          email,
          password: hashedPassword,
          role: 'MEMBER',
        },
      });
      dummyUsers.push(user);

      // Login to obtain JWT
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: 'password123' });
      dummyTokens.push(loginRes.body.data.token);
    }

    // 3. Create a test event with quota = 2
    const startTime = new Date(Date.now() + 1000 * 60 * 60).toISOString();
    const endTime = new Date(Date.now() + 1000 * 60 * 180).toISOString();
    const eventRes = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${leadToken}`)
      .send({
        title: `Quota Race Condition Event ${Date.now()}`,
        description: 'Testing PostgreSQL row lock & atomic decrement under concurrency',
        quota: 2,
        startTime,
        endTime,
      });
    testEventId = eventRes.body.data.event.id;
  });

  afterAll(async () => {
    // Teardown: delete registrations, test event, and dummy users
    if (testEventId) {
      await prisma.eventRegistration.deleteMany({ where: { eventId: testEventId } });
      await prisma.event.delete({ where: { id: testEventId } }).catch(() => {});
    }
    await prisma.user.deleteMany({
      where: { email: { contains: '@test.local' } },
    });
    await prisma.$disconnect();
  });

  it('should guarantee zero overbooking: exactly 2 succeed (201) and 3 fail (409) under parallel requests', async () => {
    // Fire all 5 registration requests concurrently at the same millisecond
    const parallelRequests = dummyTokens.map((token) =>
      request(app)
        .post(`/api/v1/events/${testEventId}/register`)
        .set('Authorization', `Bearer ${token}`),
    );

    const responses = await Promise.all(parallelRequests);

    const successfulResponses = responses.filter((res) => res.status === 201);
    const quotaExceededResponses = responses.filter((res) => res.status === 409);

    // Assert exactly 2 successful registrations
    expect(successfulResponses.length).toBe(2);
    successfulResponses.forEach((res) => {
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Registered for event successfully.');
    });

    // Assert exactly 3 rejected registrations
    expect(quotaExceededResponses.length).toBe(3);
    quotaExceededResponses.forEach((res) => {
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Event quota is full or event does not exist.');
    });

    // Verify database state: registered_count must be EXACTLY 2 (zero overbooking)
    const dbEvent = await prisma.event.findUnique({ where: { id: testEventId } });
    expect(dbEvent.registeredCount).toBe(2);

    // Verify row count in event_registrations table
    const registrationCount = await prisma.eventRegistration.count({
      where: { eventId: testEventId },
    });
    expect(registrationCount).toBe(2);
  });

  it('should reject duplicate registration from an already registered user with HTTP 409', async () => {
    // Find one of the users who registered successfully
    const registeredRecords = await prisma.eventRegistration.findMany({
      where: { eventId: testEventId },
    });
    const firstRegisteredUserId = registeredRecords[0].userId;
    const userIndex = dummyUsers.findIndex((u) => u.id === firstRegisteredUserId);
    const token = dummyTokens[userIndex];

    const duplicateRes = await request(app)
      .post(`/api/v1/events/${testEventId}/register`)
      .set('Authorization', `Bearer ${token}`);

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.success).toBe(false);
    expect(duplicateRes.body.message).toBe('You are already registered for this event.');
  });
});
