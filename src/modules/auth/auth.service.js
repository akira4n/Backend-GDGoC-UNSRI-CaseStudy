import * as authRepository from './auth.repository.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { generateToken } from '../../utils/jwt.js';

export const register = async ({ name, email, password, division }) => {
  const existingUser = await authRepository.findUserByEmail(email);
  if (existingUser) {
    const err = new Error('Email is already registered.');
    err.status = 409;
    throw err;
  }

  const hashedPassword = await hashPassword(password);

  const user = await authRepository.createUser({
    name,
    email,
    password: hashedPassword,
    division: division || null,
    role: 'MEMBER',
  });

  return user;
};

export const login = async ({ email, password }) => {
  const user = await authRepository.findUserByEmail(email);
  if (!user || user.deletedAt) {
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  const token = generateToken({ id: user.id, role: user.role });

  const userProfile = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    division: user.division,
    createdAt: user.createdAt,
  };

  return { user: userProfile, token };
};
