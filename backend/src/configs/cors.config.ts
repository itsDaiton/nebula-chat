export const corsConfig = {
  allowedOrigins: [process.env.CLIENT_URL, process.env.DEV_CLIENT_URL],
  allowedMethods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
  maxAge: 86400,
};

export const checkOrigin = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) => {
  if (!origin || corsConfig.allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error(`Origin ${origin} not allowed by CORS.`));
  }
};
