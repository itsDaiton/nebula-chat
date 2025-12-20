import 'dotenv/config';
import type { Request, Response } from 'express';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { checkOrigin, corsConfig } from './config/cors.config';
import { registerRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { openApiDocument } from './openapi';

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

app.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(openApiDocument);
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Welcome to the Nebula Chat API' });
});
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.use(errorHandler);

app.listen(PORT, () => {
  const serverUrl = process.env.SERVER_URL || `http://localhost:${PORT}`;
  // eslint-disable-next-line no-console
  console.log(`🚀 Server running...`);
  // eslint-disable-next-line no-console
  console.log(`📘 API Documentation: ${serverUrl}/docs`);
});
