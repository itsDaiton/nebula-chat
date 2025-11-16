import { setHeaders } from '@backend/configs/headers.config';
import { generateResponseStream } from '@backend/services/chat.service';
import { validateChatRequest } from '@backend/validators/chat.validator';
import type { ChatErrorResponse } from '@backend/types/chat.types';
import type { Request, Response } from 'express';

export async function sendMessageStream(req: Request, res: Response) {
  const validation = validateChatRequest(req.body);

  if (!validation.valid) {
    const errorResponse: ChatErrorResponse = {
      success: false,
      error: validation.error,
    };
    return res.status(400).json(errorResponse);
  }

  const { messages, model } = validation.data;

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
