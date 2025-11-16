import 'dotenv/config';

const envOrigins = [process.env.CLIENT_URL, process.env.DEV_CLIENT_URL].filter(Boolean) as string[];

export const corsConfig = {
  allowedOrigins: envOrigins,
  allowedMethods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
  maxAge: 86400,
};

export const checkOrigin = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) => {
  if (!origin) {
    return callback(null, true);
  }
  if (corsConfig.allowedOrigins.includes(origin)) {
    return callback(null, true);
  }
  callback(new Error(`Origin ${origin} not allowed by CORS.`));
};
