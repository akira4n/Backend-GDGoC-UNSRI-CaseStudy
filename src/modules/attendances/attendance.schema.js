import { z } from 'zod';

export const checkInSchema = z.object({
  params: z.object({
    eventId: z.string().uuid({ error: 'Invalid event ID format.' }),
  }),
});
