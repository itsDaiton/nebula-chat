import { CHAT_ERRORS } from '@backend/shared/errors/chat.errors';
import type { ChatErrorResponse } from '@backend/modules/chat/chat.types';
import { validateChatRequest } from '@backend/modules/chat/chat.validator';
import type { Request, Response, NextFunction } from 'express';

export const validateChat = (req: Request, res: Response, next: NextFunction) => {
  const validation = validateChatRequest(req.body);

  if (!validation.valid) {
    const errorResponse: ChatErrorResponse = {
      success: false,
      error: validation.error ?? CHAT_ERRORS.INVALID_REQUEST_BODY,
    };
    return res.status(400).json(errorResponse);
  }

  req.body = validation.data;
  next();
};
