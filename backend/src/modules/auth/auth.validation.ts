import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const sessionTokenSchema = z.object({
  headers: z.object({
    'x-nebula-bootstrap': z.string().min(1, 'Bootstrap secret is required'),
  }),
});

export const sessionTokenResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    accessToken: z.string().describe('JWT access token for authentication'),
    expiresIn: z.string().describe('Token expiration time in seconds'),
    tokenType: z.string().describe('Bearer token type'),
  }),
});
