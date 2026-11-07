import { z } from 'zod';

export const createEventSchema = z
  .object({
    body: z.object({
      title: z
        .string()
        .min(3, { error: 'Title must be at least 3 characters long.' }),
      description: z.string().optional(),
      quota: z
        .number({ error: 'Quota is required and must be a number.' })
        .int({ error: 'Quota must be an integer.' })
        .positive({ error: 'Quota must be a positive integer.' }),
      startTime: z
        .iso
        .datetime({ error: 'Invalid start time ISO format.' }),
      endTime: z.iso.datetime({ error: 'Invalid end time ISO format.' }),
    }),
  })
  .refine(
    (data) => new Date(data.body.startTime) < new Date(data.body.endTime),
    {
      error: 'End time must be later than start time.',
      path: ['body', 'endTime'],
    },
  );

export const updateEventSchema = z
  .object({
    params: z.object({
      id: z.uuid({ error: 'Invalid event ID format.' }),
    }),
    body: z.object({
      title: z
        .string()
        .min(3, { error: 'Title must be at least 3 characters long.' })
        .optional(),
      description: z.string().optional(),
      quota: z
        .number({ error: 'Quota must be a number.' })
        .int({ error: 'Quota must be an integer.' })
        .positive({ error: 'Quota must be a positive integer.' })
        .optional(),
      startTime: z
        .iso
        .datetime({ error: 'Invalid start time ISO format.' })
        .optional(),
      endTime: z
        .iso
        .datetime({ error: 'Invalid end time ISO format.' })
        .optional(),
    }),
  })
  .refine(
    (data) => {
      if (data.body.startTime && data.body.endTime) {
        return new Date(data.body.startTime) < new Date(data.body.endTime);
      }
      return true;
    },
    {
      error: 'End time must be later than start time.',
      path: ['body', 'endTime'],
    },
  );

export const eventParamSchema = z.object({
  params: z.object({
    id: z.uuid({ error: 'Invalid event ID format.' }),
  }),
});

export const getEventsSchema = z.object({
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
    search: z.string().optional(),
    sortBy: z
      .enum(['startTime', 'title', 'createdAt', 'quota'])
      .optional()
      .default('startTime'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  }),
});
