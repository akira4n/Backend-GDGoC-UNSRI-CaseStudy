import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';
import { hashPassword } from '../../src/utils/password.js';

describe('User RBAC, Soft Delete & Audit Integration Test', () => {
  let leadToken;
  let leadId;
  let divHeadToken;
  let memberToken;
  let dummyUserId;
  let dummyUserToken;

  beforeAll(async () => {
    // 1. Login as LEAD (from seeder)
    const leadLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'lead@gdgoc-unsri.org', password: 'password123' });
    leadToken = leadLogin.body.data.token;
    leadId = leadLogin.body.data.user.id;

    // 2. Login as DIVISION_HEAD (from seeder)
    const divHeadLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'head.web@gdgoc-unsri.org', password: 'password123' });
    divHeadToken = divHeadLogin.body.data.token;

    // 3. Login as MEMBER (from seeder)
    const memberLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'member@gdgoc-unsri.org', password: 'password123' });
    memberToken = memberLogin.body.data.token;

    // 4. Create a dedicated dummy member for mutation & soft delete tests
    const hashedPassword = await hashPassword('password123');
    const dummyEmail = `rbac.dummy.${Date.now()}@test.local`;
    const dummyUser = await prisma.user.create({
      data: {
        name: 'Dummy RBAC Subject',
        email: dummyEmail,
        password: hashedPassword,
        role: 'MEMBER',
        division: 'Mobile Development',
      },
    });
    dummyUserId = dummyUser.id;

    const dummyLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: dummyEmail, password: 'password123' });
    dummyUserToken = dummyLogin.body.data.token;
  });

  afterAll(async () => {
    // Clean up only dummy audit logs and dummy user
    if (dummyUserId) {
      await prisma.auditLog.deleteMany({ where: { targetId: dummyUserId } });
      await prisma.user.delete({ where: { id: dummyUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('User Listing & RBAC Permissions', () => {
    it('should forbid MEMBER from accessing user list (HTTP 403)', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Forbidden.');
    });

    it('should allow DIVISION_HEAD to access user list (HTTP 200)', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${divHeadToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('should allow LEAD to access user list with pagination and search (HTTP 200)', async () => {
      const res = await request(app)
        .get('/api/v1/users?page=1&limit=5&search=Dummy')
        .set('Authorization', `Bearer ${leadToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.meta.limit).toBe(5);
    });
  });

  describe('Role Mutation & Audit Trail', () => {
    it('should forbid DIVISION_HEAD from updating user role (HTTP 403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${dummyUserId}/role`)
        .set('Authorization', `Bearer ${divHeadToken}`)
        .send({ role: 'DIVISION_HEAD' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Forbidden.');
    });

    it('should allow LEAD to update user role and generate UPDATE_USER_ROLE audit log (HTTP 200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${dummyUserId}/role`)
        .set('Authorization', `Bearer ${leadToken}`)
        .send({ role: 'DIVISION_HEAD' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('DIVISION_HEAD');

      // Verify audit log entry in PostgreSQL
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          targetId: dummyUserId,
          action: 'UPDATE_USER_ROLE',
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog.actorId).toBe(leadId);
      expect(auditLog.oldValues).toEqual({ role: 'MEMBER' });
      expect(auditLog.newValues).toEqual({ role: 'DIVISION_HEAD' });
    });
  });

  describe('Soft Delete & Self-Deactivation Guard', () => {
    it('should prevent LEAD from deactivating their own account (HTTP 400)', async () => {
      const res = await request(app)
        .delete(`/api/v1/users/${leadId}`)
        .set('Authorization', `Bearer ${leadToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('You cannot deactivate your own account.');
    });

    it('should allow LEAD to soft delete dummy user and record SOFT_DELETE_USER audit log (HTTP 200)', async () => {
      const res = await request(app)
        .delete(`/api/v1/users/${dummyUserId}`)
        .set('Authorization', `Bearer ${leadToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('User account deactivated successfully.');

      // Verify soft delete in database
      const dbUser = await prisma.user.findUnique({ where: { id: dummyUserId } });
      expect(dbUser.deletedAt).not.toBeNull();

      // Verify audit log
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          targetId: dummyUserId,
          action: 'SOFT_DELETE_USER',
        },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog.actorId).toBe(leadId);
    });

    it('should reject login attempt by a soft-deleted user (HTTP 401)', async () => {
      const dummyUser = await prisma.user.findUnique({ where: { id: dummyUserId } });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: dummyUser.email, password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password.');
    });

    it('should reject existing token of a soft-deleted user at auth middleware (HTTP 401)', async () => {
      const res = await request(app)
        .post('/api/v1/events/00000000-0000-0000-0000-000000000000/register')
        .set('Authorization', `Bearer ${dummyUserToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Account has been deactivated or no longer exists.');
    });
  });

  describe('Audit Logs Access RBAC', () => {
    it('should forbid non-LEAD users from accessing audit logs (HTTP 403)', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${divHeadToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Forbidden.');
    });

    it('should allow LEAD to retrieve audit logs with actor details (HTTP 200)', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs?page=1&limit=10')
        .set('Authorization', `Bearer ${leadToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });
  });
});
