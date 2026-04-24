import { env } from '@backend/env';

export const corsConfig = {
  allowedOrigins: [env.CLIENT_URL, env.SERVER_URL].filter(
    (value): value is string => Boolean(value),
  ),
  allowedMethods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
  maxAge: 86400,
};

export const checkOrigin = (origin: string | undefined): boolean => {
  if (!origin) {
    return true;
  }

  if (env.SERVER_URL && origin === env.SERVER_URL) {
    return true;
  }

  return corsConfig.allowedOrigins.includes(origin);
};
