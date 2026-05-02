import type { FastifyReply, FastifyRequest } from 'fastify';
import { setHeaders } from '@backend/config/headers.config';
import type { CreateChatStreamDTO } from '@backend/modules/chat/chat.types';
import { chatService } from '@backend/modules/chat/chat.service';
import { sseEnd } from '@nebula-chat/langchain';

export const chatController = {
  async streamMessage(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (reply.raw.writableEnded) return;

    const input = req.body as CreateChatStreamDTO;

    reply.hijack();
    const raw = reply.raw;

    setHeaders(raw, req.headers.origin);
    raw.flushHeaders?.();

    const result = await chatService.streamResponse(
      input,
      (chunk) => raw.write(chunk),
      'anonymous',
      req.log,
    );

    if (result) {
      (req.body as CreateChatStreamDTO).conversationId = result.conversationId;
    }

    raw.write(sseEnd());
    raw.end();
  },
};
