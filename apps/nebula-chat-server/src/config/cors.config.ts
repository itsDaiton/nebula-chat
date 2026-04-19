import 'dotenv/config';

export const corsConfig = {
  allowedOrigins: [process.env.CLIENT_URL, process.env.SERVER_URL].filter(Boolean) as string[],
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

  const serverUrl = process.env.SERVER_URL;
  if (serverUrl && origin === serverUrl) {
    return callback(null, true);
  }

  if (corsConfig.allowedOrigins.includes(origin)) {
    return callback(null, true);
  }
  callback(new Error(`Origin ${origin} not allowed by CORS.`));
};
