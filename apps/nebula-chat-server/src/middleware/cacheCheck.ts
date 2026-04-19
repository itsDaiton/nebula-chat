import type { Request, Response, NextFunction } from 'express';
import { cacheService } from '@backend/cache/cache.service';
import { setCacheHeaders } from '@backend/config/headers.config';
import { streamFormatter } from '@backend/modules/chat/chat.utils';
import type { CreateChatStreamDTO } from '@backend/modules/chat/chat.types';
import { createUserMessage, validateChatRequest } from '@backend/modules/chat/chat.service';
import { messageService } from '@backend/modules/message/message.service';

export const cacheCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = cacheService.generateKey(req.body);
    const cachedData = await cacheService.getFromCache(key);

    if (!cachedData) {
      return next();
    }
    //eslint-disable-next-line no-console
    console.log('Redis: Cache hit');

    const input = req.body as CreateChatStreamDTO;
    const conversationId = input.conversationId;
    const userMessage = input.messages[0];

    if (!userMessage) {
      return next();
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
      model: input.model,
      ...(cachedData.usageData !== undefined && { tokens: cachedData.usageData }),
    });

    const {
      userMessageId,
      conversationId: finalConversationId,
      isNewConversation,
    } = userMessageResult;
    const assistantMessageId = assistantMessage.id;

    // Send SSE response
    setCacheHeaders(res, req.headers.origin);
    res.flushHeaders();

    // Send conversation created event if new
    if (isNewConversation) {
      streamFormatter.writeConversationCreated(res, finalConversationId);
    }

    // Send user message created event
    streamFormatter.writeUserMessageCreated(res, userMessageId);

    // Send cache hit event
    streamFormatter.writeCacheHit(res);

    // Send cached tokens (assistant response)
    res.write(cachedData.tokens.trimEnd());
    res.write('\n\n');

    streamFormatter.writeUsage(
      res,
      cachedData.usageData ?? {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    );

    // Send assistant message created event
    streamFormatter.writeAssistantMessageCreated(res, assistantMessageId);

    // Send end event
    streamFormatter.writeEnd(res);
    return res.end();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Cache check error (fail-open):', error);
    return next();
  }
};
