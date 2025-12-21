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

      await chatService.streamResponse(input, {
        onConversationCreated: (conversationId) => {
          req.body.conversationId = conversationId;
          streamFormatter.writeConversationCreated(res, conversationId);
        },
        onUserMessageCreated: (messageId) => {
          streamFormatter.writeUserMessageCreated(res, messageId);
        },
        onToken: (token) => {
          streamFormatter.writeToken(res, token);
        },
        onUsage: (usageData) => {
          streamFormatter.writeUsage(res, usageData);
        },
        onAssistantMessageCreated: (messageId) => {
          streamFormatter.writeAssistantMessageCreated(res, messageId);
        },
        onError: (error) => {
          streamFormatter.writeError(res, error);
        },
      });

      streamFormatter.writeEnd(res);
      res.end();
    } catch (error) {
      next(error);
    }
  },
};
