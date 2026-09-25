import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import { bindAttributes, componentLogger, logEvent } from '@nebula-chat/otel';
import { setCacheHeaders } from '@backend/config/headers.config';
import { createUserMessage, validateChatRequest } from '@backend/modules/chat/chat.service';
import type { CreateChatStreamDTO } from '@backend/modules/chat/chat.types';
import { chatCacheKey, getCachedStream } from '@backend/redis';
import { getSessionData } from '@backend/plugins/authGate.plugin';
import {
  sseConversationCreated,
  sseUserMessageCreated,
  sseCacheHit,
  sseUsage,
  sseAssistantMessageCreated,
  sseEnd,
} from '@nebula-chat/langchain';
import { messageService } from '@backend/modules/message/message.service';

/**
 * Replays a cached Direct reply. Fail-open: any failure here (a Redis error, a
 * replay that cannot be persisted) is a `warn` and the request falls through to
 * a normal model call — the user is unaffected.
 *
 * A replay is still a Direct reply, so it writes the same one-per-reply
 * `chat.reply.completed` summary `chat.service` does, marked by its
 * `nebula.cache.key`.
 */
export const cacheCheckHook: preHandlerAsyncHookHandler = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  const startMs = Date.now();
  const log = componentLogger(req.log, 'redis');
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
    logEvent(log, 'debug', 'cache.hit', { 'nebula.cache.key': key }, 'Replaying a cached reply');

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
          logEvent(
            log,
            'warn',
            'cache.entry.unparseable',
            { 'nebula.cache.key': key },
            'Skipped an unparseable token line in a cached reply',
          );
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

    logEvent(
      componentLogger(
        bindAttributes(req.log, { 'nebula.session.id': finalConversationId }),
        'chat',
      ),
      'info',
      'chat.reply.completed',
      {
        'nebula.outcome': 'completed',
        'nebula.message.id': userMessageId,
        'nebula.reply.message.id': assistantMessageId,
        'nebula.cache.key': key,
        'gen_ai.request.model': body.model,
        'gen_ai.usage.input_tokens': cachedData.usageData?.promptTokens,
        'gen_ai.usage.output_tokens': cachedData.usageData?.completionTokens,
        'nebula.duration_ms': Date.now() - startMs,
      },
      `Direct reply replayed from the cache · ${body.model} · ${cachedData.usageData?.totalTokens ?? 0} tokens`,
    );
  } catch (error) {
    logEvent(
      log,
      'warn',
      'cache.check.failed',
      { err: error },
      'Cache check failed; calling the model instead',
    );
  }
};
