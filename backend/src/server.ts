import 'dotenv/config';
import type { Request, Response } from 'express';
import express from 'express';
import cors from 'cors';
import { chatRoutes } from './modules/chat/chat.routes';
import { checkOrigin, corsConfig } from './config/cors.config';
import { conversationRoutes } from './modules/conversation/conversation.routes';
import { messageRoutes } from './modules/message/message.routes';
import { cacheRoutes } from './routes/cache.routes';

const app: express.Express = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: checkOrigin,
    ...corsConfig,
  }),
);
app.use(express.json({ limit: '10mb' }));

app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/cache', cacheRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('Backend running...');
});
app.get('/health', (req: Request, res: Response) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server is running on http://localhost:${PORT}`);
});
