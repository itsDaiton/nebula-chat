import { env } from '@backend/env';

const allowedOrigins = [env.CLIENT_URL, env.SERVER_URL].filter((v): v is string => Boolean(v));

export const corsOptions = {
  origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void): void => {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400,
};
