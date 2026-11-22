import { env } from '@server/env';

// The one allow-list: CORS and the mutation Origin check (`originCheck.plugin.ts`) both read it.
export const allowedOrigins = new Set(
  // SERVER_URL is there only so Swagger UI on the API origin can call the API.
  [env.CLIENT_URL, env.API_DOCS_ENABLED ? env.SERVER_URL : undefined].filter((v): v is string =>
    Boolean(v),
  ),
);

export const corsOptions = {
  origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void): void => {
    if (!origin || allowedOrigins.has(origin)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400,
};
