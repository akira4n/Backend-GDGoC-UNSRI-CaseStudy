import { jest } from '@jest/globals';

const mockFindUserByEmail = jest.fn();
const mockCreateUser = jest.fn();
const mockComparePassword = jest.fn();

jest.unstable_mockModule('../../src/modules/auth/auth.repository.js', () => ({
  findUserByEmail: mockFindUserByEmail,
  createUser: mockCreateUser,
}));

jest.unstable_mockModule('../../src/utils/password.js', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashedpassword'),
  comparePassword: mockComparePassword,
}));

// Dynamic import after mockModule
const authService = await import('../../src/modules/auth/auth.service.js');

describe('Auth Service (Unit Test)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new member successfully with hashed password', async () => {
      mockFindUserByEmail.mockResolvedValue(null);
      mockCreateUser.mockResolvedValue({
        id: 'user-uuid-1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'MEMBER',
        division: 'Backend',
        createdAt: new Date(),
      });

      const result = await authService.register({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        division: 'Backend',
      });

      expect(mockFindUserByEmail).toHaveBeenCalledWith('john@example.com');
      expect(mockCreateUser).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.email).toBe('john@example.com');
      expect(result.role).toBe('MEMBER');
    });

    it('should throw HTTP 409 Conflict if email is already registered', async () => {
      mockFindUserByEmail.mockResolvedValue({
        id: 'existing-id',
        email: 'john@example.com',
      });

      await expect(
        authService.register({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
        }),
      ).rejects.toMatchObject({
        message: 'Email is already registered.',
        status: 409,
      });
    });
  });

  describe('login', () => {
    it('should login successfully and return token with user data', async () => {
      const mockUser = {
        id: 'user-uuid-1',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashedpassword',
        role: 'MEMBER',
        division: 'Backend',
        deletedAt: null,
      };

      mockFindUserByEmail.mockResolvedValue(mockUser);
      mockComparePassword.mockResolvedValue(true);

      const result = await authService.login({
        email: 'john@example.com',
        password: 'password123',
      });

      expect(result.token).toBeDefined();
      expect(result.user.password).toBeUndefined();
      expect(result.user.email).toBe('john@example.com');
    });

    it('should throw HTTP 401 if user does not exist', async () => {
      mockFindUserByEmail.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'notfound@example.com',
          password: 'password123',
        }),
      ).rejects.toMatchObject({
        message: 'Invalid email or password.',
        status: 401,
      });
    });

    it('should throw HTTP 401 if password does not match', async () => {
      const mockUser = {
        id: 'user-uuid-1',
        email: 'john@example.com',
        password: 'hashedpassword',
        deletedAt: null,
      };

      mockFindUserByEmail.mockResolvedValue(mockUser);
      mockComparePassword.mockResolvedValue(false);

      await expect(
        authService.login({
          email: 'john@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toMatchObject({
        message: 'Invalid email or password.',
        status: 401,
      });
    });

    it('should throw HTTP 401 if user account is soft-deleted', async () => {
      const mockUser = {
        id: 'user-uuid-1',
        email: 'john@example.com',
        password: 'hashedpassword',
        deletedAt: new Date(),
      };

      mockFindUserByEmail.mockResolvedValue(mockUser);

      await expect(
        authService.login({
          email: 'john@example.com',
          password: 'password123',
        }),
      ).rejects.toMatchObject({
        message: 'Invalid email or password.',
        status: 401,
      });
    });
  });
});
