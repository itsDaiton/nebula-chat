import 'dotenv/config';
import type { Request, Response } from 'express';
import express from 'express';
import cors from 'cors';
import { checkOrigin, corsConfig } from './config/cors.config';
import { registerRoutes } from './routes/routes';
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

app.get('/', (_req: Request, res: Response) => {
  res.send('Backend running...');
});
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.use(errorHandler);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server is running on http://localhost:${PORT}`);
});
