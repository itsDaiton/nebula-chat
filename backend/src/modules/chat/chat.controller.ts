import { setHeaders } from '@backend/config/headers.config';
import { generateResponseStream } from '@backend/modules/chat/chat.service';
import type { ChatMessage } from '@backend/modules/chat/chat.types';
import type { Request, Response } from 'express';

export async function sendMessageStream(req: Request, res: Response) {
  const { messages, model } = req.body as {
    messages: ChatMessage[];
    model: string;
  };

  setHeaders(res, req.headers.origin);
  res.flushHeaders();

  try {
    await generateResponseStream(
      messages,
      model,
      (token) => {
        res.write(`event: token\n`);
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      },
      (usageData) => {
        res.write(`event: usage\n`);
        res.write(`data: ${JSON.stringify(usageData)}\n\n`);
      },
    );
    res.write('event: end\n');
    res.write('data: end\n\n');
    res.end();
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error.');
    res.write('event: error\n');
    res.write(`data: ${JSON.stringify(err.message)}\n\n`);
    res.end();
  }
}
