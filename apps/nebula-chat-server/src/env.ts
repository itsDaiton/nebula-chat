import 'dotenv/config';
import { z } from 'zod';
import { MODEL_REGISTRY } from '@nebula-chat/langchain';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  REDIS_PASSWORD: z.string().optional(),
  LLM_API_KEY: z.string().min(1),
  LLM_PROVIDER: z.enum(['openai', 'anthropic']).default('openai'),
  LLM_MODEL: z
    .string()
    .optional()
    .refine((value) => !value || Object.hasOwn(MODEL_REGISTRY, value), {
      message: 'Invalid model name',
    }),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  SERVER_URL: z.string().optional(),
  TRUST_PROXY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
