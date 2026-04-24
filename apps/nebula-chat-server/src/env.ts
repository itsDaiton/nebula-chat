import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  REDIS_PASSWORD: z.string().optional(),
  OPENAI_API_KEY: z.string().min(1),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  SERVER_URL: z.string().optional(),
  TRUST_PROXY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
