import { env } from '@backend/env';
import { db } from '@backend/db';
import type { DbTransaction } from '@nebula-chat/db';
import type { CreateChatStreamDTO } from '@backend/modules/chat/chat.types';
import { messageService } from '@backend/modules/message/message.service';
import { messageRepository } from '@backend/modules/message/message.repository';
import type { CreateMessageDTO } from '@backend/modules/message/message.types';
import { conversationRepository } from '@backend/modules/conversation/conversation.repository';
import {
  streamChat,
  countTokens,
  createRateLimiter,
  sseConversationCreated,
  sseUserMessageCreated,
  sseAssistantMessageCreated,
  sseToken,
  sseUsage,
  sseError,
} from '@nebula-chat/langchain';
import type { LLMLogger } from '@nebula-chat/langchain';
import { SYSTEM_PROMPT } from '@backend/modules/chat/chat.prompt';
import { NotFoundError, PayloadTooLargeError, BadRequestError } from '@backend/errors/AppError';

const MAX_PROMPT_TOKENS = 2000;
const MAX_HISTORY_MESSAGES = 20;

const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20 });

export const createUserMessage = async (
  conversationId: string | undefined,
  userMessageContent: string,
  userMessageRole: CreateMessageDTO['role'],
): Promise<{ conversationId: string; userMessageId: string; isNewConversation: boolean }> => {
  const result = await db.transaction(async (tx: DbTransaction) => {
    let convId = conversationId;
    let isNewConversation = false;

    if (convId) {
      const existingConversation = await conversationRepository.findByIdTx(tx, convId);
      if (!existingConversation) {
        throw new NotFoundError('Conversation', convId);
      }
    } else {
      const title = userMessageContent.slice(0, 50) || 'New Chat';
      const newConversation = await conversationRepository.createTx(tx, title);
      convId = newConversation.id;
      isNewConversation = true;
    }

    if (!convId) {
      throw new BadRequestError('Conversation id could not be resolved.');
    }

    const newUserMessage = await messageRepository.createTx(tx, {
      conversationId: convId,
      role: userMessageRole,
      content: userMessageContent,
    });

    return {
      conversationId: convId,
      userMessageId: newUserMessage.id,
      isNewConversation,
    };
  });

  return result;
};

export const validateChatRequest = async (
  conversationId: string | undefined,
  userMessage: { role: string; content: string },
  model?: string,
) => {
  if (userMessage.role !== 'user') {
    throw new BadRequestError(
      `Expected message with role 'user', received '${userMessage.role}'. Only user messages can be sent.`,
    );
  }

  const tokens = countTokens(userMessage.content, model);
  if (tokens > MAX_PROMPT_TOKENS) {
    throw new PayloadTooLargeError(
      `User message exceeds token limit. Message has ${tokens} tokens, maximum allowed is ${MAX_PROMPT_TOKENS} tokens.`,
    );
  }

  if (conversationId) {
    const existingConversation = await conversationRepository.findByIdSimple(conversationId);
    if (!existingConversation) {
      throw new NotFoundError('Conversation', conversationId);
    }
  }
};

export const chatService = {
  async streamResponse(
    data: CreateChatStreamDTO,
    write: (chunk: string) => void,
    userId = 'anonymous',
    logger?: LLMLogger,
  ): Promise<
    { conversationId: string; userMessageId: string; assistantMessageId: string } | undefined
  > {
    const { allowed, retryAfterMs } = rateLimiter.check(userId);
    if (!allowed) {
      logger?.warn({ userId, retryAfterMs }, 'LLM rate limit exceeded');
      write(sseError(`Rate limit exceeded. Retry after ${retryAfterMs}ms.`));
      return;
    }

    let conversationId = data.conversationId;
    let userMessageId: string | undefined;
    let assistantMessageId: string | undefined;

    try {
      if (data.messages.length !== 1) {
        throw new BadRequestError(`Expected one message, received ${data.messages.length}.`);
      }

      const userMessage = data.messages[0]!;
      const requestedModel = data.model ?? env.LLM_MODEL;
      await validateChatRequest(conversationId, userMessage, requestedModel);

      const result = await createUserMessage(conversationId, userMessage.content, userMessage.role);
      conversationId = result.conversationId;
      userMessageId = result.userMessageId;

      if (result.isNewConversation) {
        write(sseConversationCreated(conversationId));
      }
      write(sseUserMessageCreated(userMessageId));

      const dbHistory = await messageRepository.findByConversationId(
        conversationId,
        MAX_HISTORY_MESSAGES,
      );

      const history = dbHistory
        .filter((m) => m.id !== userMessageId)
        .toReversed()
        .map((m) => ({ role: m.role, content: m.content }));

      const streamConfig: Parameters<typeof streamChat>[0] = {
        provider: env.LLM_PROVIDER,
        apiKey: env.LLM_API_KEY,
        systemPrompt: SYSTEM_PROMPT,
        history,
        userMessage: userMessage.content,
        model: requestedModel,
      };
      if (logger !== undefined) streamConfig.logger = logger;

      let fullResponse = '';
      let totalTokens: number | null = null;
      await streamChat(streamConfig, {
        onToken: (token) => {
          fullResponse += token;
          write(sseToken(token));
        },
        onUsage: (usage) => {
          totalTokens = usage.totalTokens ?? null;
          write(sseUsage(usage));
        },
      });

      if (!fullResponse.trim()) {
        const fallback = 'The assistant did not generate a response.';
        const errMsg = await messageService.createMessage({
          conversationId,
          role: 'assistant',
          content: fallback,
          tokenCount: totalTokens,
        });
        assistantMessageId = errMsg.id;
        write(sseAssistantMessageCreated(assistantMessageId));
        throw new Error(fallback);
      }

      const assistantMessage = await messageService.createMessage({
        conversationId,
        role: 'assistant',
        content: fullResponse,
        tokenCount: totalTokens,
      });
      assistantMessageId = assistantMessage.id;
      write(sseAssistantMessageCreated(assistantMessageId));

      return { conversationId, userMessageId, assistantMessageId };
    } catch (error) {
      write(sseError(error instanceof Error ? error.message : 'Unknown error occurred'));
    }
  },
};
