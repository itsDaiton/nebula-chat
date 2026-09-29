import type { ZodType } from 'zod';

// fastify-zod-openapi reads the description from the response object; `.describe()` on the schema doesn't reach it.
export const jsonResponse = <T extends ZodType>(description: string, schema: T) => ({
  description,
  content: { 'application/json': { schema } },
});
