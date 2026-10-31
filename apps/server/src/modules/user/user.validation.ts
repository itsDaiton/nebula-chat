import { z } from 'zod';

export const userIdParamsSchema = z.object({
  id: z.uuid().describe('The id of the User'),
});
