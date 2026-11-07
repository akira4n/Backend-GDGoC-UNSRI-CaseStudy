import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';

describe('Auth Integration Test', () => {
  const testEmail = `auth.test.${Date.now()}@test.local`;
  const plainPassword = 'password123';

  afterAll(async () => {
    // Cleanup only dummy test users
    await prisma.user.deleteMany({
      where: { email: { contains: '@test.local' } },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new member with role MEMBER and conceal password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Integration Tester',
          email: testEmail,
          password: plainPassword,
          division: 'Web Development',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.user.role).toBe('MEMBER');
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should prevent mass assignment: body with role LEAD must still be created as MEMBER', async () => {
      const maliciousEmail = `malicious.${Date.now()}@test.local`;

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Hacker Wannabe',
          email: maliciousEmail,
          password: plainPassword,
          role: 'LEAD', // Attempting privilege escalation via mass assignment
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('MEMBER');

      // Double check directly in database
      const dbUser = await prisma.user.findUnique({ where: { email: maliciousEmail } });
      expect(dbUser.role).toBe('MEMBER');
    });

    it('should return HTTP 409 Conflict if email is already registered', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Duplicate Tester',
          email: testEmail,
          password: plainPassword,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Email is already registered.');
    });

    it('should return HTTP 400 Bad Request if validation fails (invalid email & short password)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: '',
          email: 'not-an-email',
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials and return JWT token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: plainPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should return HTTP 401 if password is incorrect', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password.');
    });

    it('should return HTTP 401 if user does not exist', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.local',
          password: plainPassword,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password.');
    });
    it('should trigger HTTP 429 Too Many Requests when rate limit threshold is exceeded', async () => {
      // Send 5 rapid requests with rate limit enabled
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .set('x-test-rate-limit', 'true')
          .send({
            email: 'rate.limit@test.local',
            password: 'password123',
          });
      }

      // The 6th request must trigger HTTP 429
      const sixthRes = await request(app)
        .post('/api/v1/auth/login')
        .set('x-test-rate-limit', 'true')
        .send({
          email: 'rate.limit@test.local',
          password: 'password123',
        });

      expect(sixthRes.status).toBe(429);
      expect(sixthRes.body.success).toBe(false);
      expect(sixthRes.body.message).toBe('Too many attempts. Please try again later.');
    });
  });

  describe('Auth Guard Middleware', () => {
    it('should return HTTP 401 when accessing protected route without Bearer token', async () => {
      const res = await request(app).get('/api/v1/users');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication token is missing.');
    });
  });
});
