import { setHeaders } from '@backend/config/headers.config';
import type { CreateChatStreamDTO } from '@backend/modules/chat/chat.types';
import type { NextFunction, Request, Response } from 'express';
import { chatService } from './chat.service';
import { streamFormatter } from './chat.utils';

export const chatController = {
  async streamMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const input = req.body as CreateChatStreamDTO;

      setHeaders(res, req.headers.origin);
      res.flushHeaders();

      await chatService.streamResponse(
        input,
        (token) => {
          streamFormatter.writeToken(res, token);
        },
        (usageData) => {
          streamFormatter.writeUsage(res, usageData);
        },
      );
      streamFormatter.writeEnd(res);
      res.end();
    } catch (error) {
      next(error);
    }
  },
};
