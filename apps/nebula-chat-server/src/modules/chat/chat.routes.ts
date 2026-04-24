import type {
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from 'fastify';
import { cacheService } from '@backend/cache/cache.service';
import { setCacheHeaders } from '@backend/config/headers.config';
import { validate } from '@backend/middleware/validate';
import { chatController } from '@backend/modules/chat/chat.controller';
import { createUserMessage, validateChatRequest } from '@backend/modules/chat/chat.service';
import type { CreateChatStreamDTO } from '@backend/modules/chat/chat.types';
import { streamFormatter } from '@backend/modules/chat/chat.utils';
import { createChatStreamSchema } from '@backend/modules/chat/chat.validation';
import { messageService } from '@backend/modules/message/message.service';

const cacheCheckHook: preHandlerAsyncHookHandler = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const body = req.body as CreateChatStreamDTO;
    const key = cacheService.generateKey(body);
    const cachedData = await cacheService.getFromCache(key);

    if (!cachedData) {
      return;
    }
    // eslint-disable-next-line no-console
    console.log('Redis: Cache hit');

    const conversationId = body.conversationId;
    const userMessage = body.messages[0];

    if (!userMessage) {
      return;
    }

    await validateChatRequest(conversationId, userMessage);

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
          // eslint-disable-next-line no-console
          console.log('Redis: Failed to parse cached token line');
        }
      }
    }

    const userMessageResult = await createUserMessage(
      conversationId,
      userMessage.content,
      userMessage.role,
    );

    const assistantMessage = await messageService.createMessage({
      conversationId: userMessageResult.conversationId,
      role: 'assistant',
      content: assistantContent,
      model: body.model,
      ...(cachedData.usageData !== undefined && { tokens: cachedData.usageData }),
    });

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
      streamFormatter.writeConversationCreated(raw, finalConversationId);
    }

    streamFormatter.writeUserMessageCreated(raw, userMessageId);
    streamFormatter.writeCacheHit(raw);

    raw.write(cachedData.tokens.trimEnd());
    raw.write('\n\n');

    streamFormatter.writeUsage(
      raw,
      cachedData.usageData ?? {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    );

    streamFormatter.writeAssistantMessageCreated(raw, assistantMessageId);
    streamFormatter.writeEnd(raw);
    raw.end();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Cache check error (fail-open):', error);
    // Fall through — the handler will run and perform a fresh OpenAI request.
  }
};

const streamCaptureHook: preHandlerAsyncHookHandler = async (
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  if (reply.sent || reply.raw.writableEnded) {
    return;
  }

  let full = '';
  const raw = reply.raw;
  const originalWrite = raw.write.bind(raw) as typeof raw.write;

  raw.write = ((chunk: Parameters<typeof raw.write>[0], ...args: unknown[]) => {
    try {
      full += typeof chunk === 'string' ? chunk : chunk.toString();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error capturing stream chunk:', err);
    }
    return (originalWrite as unknown as (...a: unknown[]) => boolean)(chunk, ...args);
  }) as typeof raw.write;

  raw.on('finish', () => {
    if (full.trim() === '') {
      return;
    }
    const usageData = streamFormatter.extractUsageFromStream(full);
    const filtered = full
      .split('\n')
      .filter((line) => {
        if (line.startsWith('event: usage')) return false;
        if (line.startsWith('event: end')) return false;
        if (line.includes('"promptTokens"')) return false;
        if (line === 'data: end') return false;
        return true;
      })
      .join('\n');

    const finalKey = cacheService.generateKey(req.body as CreateChatStreamDTO);

    // eslint-disable-next-line no-console
    console.log('Redis: Saving to cache');
    cacheService.saveToCache(finalKey, filtered, usageData ?? undefined).catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Error saving to cache (fail-open):', error);
    });
  });
};

const chatRoutes: FastifyPluginAsync = async (app) => {
  app.post('/stream', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      },
    },
    preValidation: validate({ body: createChatStreamSchema }),
    preHandler: [cacheCheckHook, streamCaptureHook],
    handler: chatController.streamMessage,
  });
};

export default chatRoutes;
