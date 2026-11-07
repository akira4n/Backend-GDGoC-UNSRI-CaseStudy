import { generateToken, verifyToken } from '../../src/utils/jwt.js';

describe('JWT Helper (Unit Test)', () => {
  const payload = {
    id: '11111111-2222-3333-4444-555555555555',
    role: 'MEMBER',
  };

  it('should generate a valid JWT token string', () => {
    const token = generateToken(payload);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    // JWT structure: 3 parts separated by dots
    expect(token.split('.').length).toBe(3);
  });

  it('should verify and decode a valid JWT token matching the original payload', () => {
    const token = generateToken(payload);
    const decoded = verifyToken(token);

    expect(decoded).toBeDefined();
    expect(decoded.id).toBe(payload.id);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.iat).toBeDefined();
    expect(decoded.exp).toBeDefined();
  });

  it('should throw an error when verifying an invalid or tampered token', () => {
    const invalidToken = 'invalid.tampered.token';

    expect(() => verifyToken(invalidToken)).toThrow();
  });
});
