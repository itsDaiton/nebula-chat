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

  const { message, model } = validation.data;

  setHeaders(res, req.headers.origin);
  res.flushHeaders();

  try {
    await generateResponseStream(message, model, (token) => {
      res.write(`data: ${token}\n\n`);
    });
    res.write('event: end\n');
    res.write('data: end\n\n');
    res.end();
  } catch (error) {
    res.write('event: error\n');
    res.write(
      `data: ${JSON.stringify(error instanceof Error ? error.message : 'Unknown error')}\n\n`,
    );
    res.end();
  }
}
