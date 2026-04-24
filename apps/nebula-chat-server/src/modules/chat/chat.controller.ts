import type { FastifyReply, FastifyRequest } from 'fastify';
import { setHeaders } from '@backend/config/headers.config';
import type { CreateChatStreamDTO } from '@backend/modules/chat/chat.types';
import { chatService } from '@backend/modules/chat/chat.service';
import { streamFormatter } from '@backend/modules/chat/chat.utils';

export const chatController = {
  async streamMessage(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const input = req.body as CreateChatStreamDTO;

    reply.hijack();
    const raw = reply.raw;

    setHeaders(raw, req.headers.origin);
    raw.flushHeaders?.();

    await chatService.streamResponse(input, {
      onConversationCreated: (conversationId) => {
        (req.body as CreateChatStreamDTO).conversationId = conversationId;
        streamFormatter.writeConversationCreated(raw, conversationId);
      },
      onUserMessageCreated: (messageId) => {
        streamFormatter.writeUserMessageCreated(raw, messageId);
      },
      onToken: (token) => {
        streamFormatter.writeToken(raw, token);
      },
      onUsage: (usageData) => {
        streamFormatter.writeUsage(raw, usageData);
      },
      onAssistantMessageCreated: (messageId) => {
        streamFormatter.writeAssistantMessageCreated(raw, messageId);
      },
      onError: (error) => {
        streamFormatter.writeError(raw, error);
      },
    });

    streamFormatter.writeEnd(raw);
    raw.end();
  },
};
