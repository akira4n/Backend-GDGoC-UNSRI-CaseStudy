import { z } from 'zod';

export const getAuditLogsSchema = z.object({
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
    actorId: z.uuid({ error: 'Invalid actor ID format.' }).optional(),
    action: z.string().optional(),
  }),
});
