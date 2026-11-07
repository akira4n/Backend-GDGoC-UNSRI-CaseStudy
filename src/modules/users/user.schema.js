import { z } from 'zod';

export const getUsersSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 1), {
        error: 'Page must be a positive integer.',
      })
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .refine(
        (val) =>
          !val ||
          (!isNaN(Number(val)) && Number(val) >= 1 && Number(val) <= 100),
        {
          error: 'Limit must be an integer between 1 and 100.',
        },
      )
      .transform((val) => (val ? parseInt(val, 10) : 10)),
    role: z.enum(['LEAD', 'DIVISION_HEAD', 'MEMBER']).optional(),
    division: z.string().optional(),
    search: z.string().optional(),
    sortBy: z
      .enum(['createdAt', 'name', 'email', 'updatedAt'])
      .optional()
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

export const updateRoleSchema = z.object({
  params: z.object({
    id: z.uuid({ error: 'Invalid user ID format.' }),
  }),
  body: z.object({
    role: z.enum(['LEAD', 'DIVISION_HEAD', 'MEMBER'], {
      error: 'Role must be LEAD, DIVISION_HEAD, or MEMBER.',
    }),
  }),
});

export const userParamSchema = z.object({
  params: z.object({
    id: z.uuid({ error: 'Invalid user ID format.' }),
  }),
});
