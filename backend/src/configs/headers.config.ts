import type { ChatResponse } from '@backend/types/chat.types';
import type { Response } from 'express';

export const setHeaders = (res: Response<ChatResponse>, origin: string | undefined) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', origin ?? '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
};
