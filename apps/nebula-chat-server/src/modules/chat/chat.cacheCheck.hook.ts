import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import { setCacheHeaders } from '@backend/config/headers.config';
import { createUserMessage, validateChatRequest } from '@backend/modules/chat/chat.service';
import type { CreateChatStreamDTO } from '@backend/modules/chat/chat.types';
import { chatCacheKey, getCachedStream } from '@backend/redis';
import { getSessionData } from '@backend/plugins/auth.plugin';
import {
  sseConversationCreated,
  sseUserMessageCreated,
  sseCacheHit,
  sseUsage,
  sseAssistantMessageCreated,
  sseEnd,
} from '@nebula-chat/langchain';
import { messageService } from '@backend/modules/message/message.service';

export const cacheCheckHook: preHandlerAsyncHookHandler = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const body = req.body as CreateChatStreamDTO;

    // A regenerate request bypasses the cache so the model is called afresh; the
    // capture hook then overwrites the stale entry (ADR-0009).
    if (body.regenerate) {
      return;
    }

    const key = chatCacheKey(body);
    const cachedData = await getCachedStream(key);

    if (!cachedData) {
      return;
    }
    req.log.info('Redis: Cache hit');

    const conversationId = body.conversationId;
    const userMessage = body.messages[0];

    if (!userMessage) {
      return;
    }

    await validateChatRequest(conversationId, userMessage, getSessionData(req).user.id, body.model);

    const cachedTokens = cachedData.tokens;
    const lines = cachedTokens.split('\n');
    let assistantContent = '';

    for (const line of lines) {
      if (line.startsWith('data: ') && line.includes('"token"')) {
        try {
          const dataStr = line.substring(6);
          const data = JSON.parse(dataStr);
          if (data.token) {
            assistantContent += data.token;
          }
        } catch {
          req.log.warn('Redis: Failed to parse cached token line');
        }
      }
    }

    const userMessageResult = await createUserMessage(
      conversationId,
      userMessage.content,
      userMessage.role,
      getSessionData(req).user.id,
    );

    const assistantMessage = await messageService.createMessage(
      {
        conversationId: userMessageResult.conversationId,
        role: 'assistant',
        content: assistantContent,
        tokenCount: cachedData.usageData?.totalTokens ?? null,
      },
      getSessionData(req).user.id,
    );

    const {
      userMessageId,
      conversationId: finalConversationId,
      isNewConversation,
    } = userMessageResult;
    const assistantMessageId = assistantMessage.id;

    reply.hijack();
    const raw = reply.raw;
    setCacheHeaders(raw, req.headers.origin);
    raw.flushHeaders?.();

    if (isNewConversation) {
      raw.write(sseConversationCreated(finalConversationId));
    }

    raw.write(sseUserMessageCreated(userMessageId));
    raw.write(sseCacheHit());

    raw.write(cachedData.tokens.trimEnd());
    raw.write('\n\n');

    raw.write(
      sseUsage(cachedData.usageData ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 }),
    );

    raw.write(sseAssistantMessageCreated(assistantMessageId));
    raw.write(sseEnd());
    raw.end();
  } catch (error) {
    req.log.error(error, 'Cache check error (fail-open)');
  }
};
