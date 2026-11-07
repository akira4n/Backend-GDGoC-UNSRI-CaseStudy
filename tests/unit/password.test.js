import { hashPassword, comparePassword } from '../../src/utils/password.js';

describe('Password Helper (Unit Test)', () => {
  const plainPassword = 'SuperSecretPassword123!';

  it('should hash a plain password correctly using bcrypt', async () => {
    const hash = await hashPassword(plainPassword);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash).not.toBe(plainPassword);
    // Bcrypt format verification ($2a$10$ or $2b$10$)
    expect(hash).toMatch(/^\$2[ab]\$10\$/);
  });

  it('should produce different hashes for the same password due to random salt', async () => {
    const hash1 = await hashPassword(plainPassword);
    const hash2 = await hashPassword(plainPassword);

    expect(hash1).not.toBe(hash2);
  });

  it('should return true when comparing the correct plain password with the hash', async () => {
    const hash = await hashPassword(plainPassword);
    const isMatch = await comparePassword(plainPassword, hash);

    expect(isMatch).toBe(true);
  });

  it('should return false when comparing an incorrect plain password with the hash', async () => {
    const hash = await hashPassword(plainPassword);
    const isMatch = await comparePassword('WrongPassword123!', hash);

    expect(isMatch).toBe(false);
  });
});
