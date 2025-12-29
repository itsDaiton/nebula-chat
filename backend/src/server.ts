import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { checkOrigin, corsConfig } from './config/cors.config';
import { registerRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';

const app: express.Express = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: checkOrigin,
    ...corsConfig,
  }),
);
app.use(express.json({ limit: '10mb' }));

registerRoutes(app);

app.use(errorHandler);

app.listen(PORT, () => {
  const serverUrl = process.env.SERVER_URL || `http://localhost:${PORT}`;
  // eslint-disable-next-line no-console
  console.log(`🚀 Server running...`);
  // eslint-disable-next-line no-console
  console.log(`📘 API Documentation: ${serverUrl}/docs`);
});
