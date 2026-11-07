import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, { error: 'Name must be at least 2 characters long.' }),
    email: z
      .email({ error: 'Invalid email address.' })
      .transform((val) => val.toLowerCase().trim()),
    password: z
      .string()
      .min(8, { error: 'Password must be at least 8 characters long.' }),
    division: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .email({ error: 'Invalid email address.' })
      .transform((val) => val.toLowerCase().trim()),
    password: z.string().min(1, { error: 'Password is required.' }),
  }),
});
