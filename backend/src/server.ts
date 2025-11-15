import 'dotenv/config';
import type { Request, Response } from 'express';
import express from 'express';
import cors from 'cors';
import { chatRoutes } from './routes/chat.routes';

const app: express.Express = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? '*',
  }),
);
app.use(express.json());

app.use('/api/chat', chatRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('Backend running...');
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server is running on http://localhost:${PORT}`);
});
