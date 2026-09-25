import { env } from '@backend/env';
import { db } from '@backend/db';
import type { DbTransaction } from '@nebula-chat/db';
import type { ChatLogger, CreateChatStreamDTO, UsageData } from '@backend/modules/chat/chat.types';
import { messageService } from '@backend/modules/message/message.service';
import { messageRepository } from '@backend/modules/message/message.repository';
import type { CreateMessageDTO } from '@backend/modules/message/message.types';
import { conversationRepository } from '@backend/modules/conversation/conversation.repository';
import {
  streamChat,
  countTokens,
  createRateLimiter,
  getProviderForModel,
  sseConversationCreated,
  sseUserMessageCreated,
  sseAssistantMessageCreated,
  sseToken,
  sseUsage,
  sseError,
} from '@nebula-chat/langchain';
import type { ChatStreamConfig, ProviderType } from '@nebula-chat/langchain';
import { bindAttributes, componentLogger, logEvent } from '@nebula-chat/otel';
import type { LogAttributes } from '@nebula-chat/otel';
import { SYSTEM_PROMPT } from '@backend/modules/chat/chat.prompt';
import {
  NotFoundError,
  PayloadTooLargeError,
  BadRequestError,
  MissingConfigurationError,
  TooManyRequestsError,
  isAppError,
  toErrorEnvelope,
} from '@nebula-chat/errors';

const MAX_PROMPT_TOKENS = 2000;
const MAX_HISTORY_MESSAGES = 20;

const rateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20 });

export const createUserMessage = async (
  conversationId: string | undefined,
  userMessageContent: string,
  userMessageRole: CreateMessageDTO['role'],
  userId: string,
): Promise<{ conversationId: string; userMessageId: string; isNewConversation: boolean }> => {
  const result = await db.transaction(async (tx: DbTransaction) => {
    let convId = conversationId;
    let isNewConversation = false;

    if (convId) {
      // Owner-scoped (ADR-0010 §2): a conversation the caller doesn't own reads as
      // absent, so a Guest cannot append to another user's conversation.
      const existingConversation = await conversationRepository.findByIdTx(tx, convId, userId);
      if (!existingConversation) {
        throw new NotFoundError('Conversation', convId);
      }
    } else {
      const title = userMessageContent.slice(0, 50) || 'New Chat';
      // conversations.userId is NOT NULL (ADR-0010 §2): a new conversation is
      // owned by the session user (a Guest or a Registered user).
      const newConversation = await conversationRepository.createTx(tx, title, userId);
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
  userId: string,
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
    // Owner-scoped (ADR-0010 §2): another user's conversation reads as absent.
    const existingConversation = await conversationRepository.findByIdSimple(
      conversationId,
      userId,
    );
    if (!existingConversation) {
      throw new NotFoundError('Conversation', conversationId);
    }
  }
};

export const chatService = {
  /**
   * Streams one Direct reply and writes exactly one `chat.reply.completed` line
   * for it, whichever way it ends: `completed` at `info`, `rate_limited` at
   * `warn`, `failed` at `error` with `err` (or `warn` when the caller caused it,
   * as a 4xx does). The SSE catch below is the single handler for a failed
   * stream — `@nebula-chat/langchain` rethrows without logging — so a failure
   * is logged once.
   */
  async streamResponse(
    data: CreateChatStreamDTO,
    write: (chunk: string) => void,
    userId: string,
    logger: ChatLogger,
  ): Promise<
    { conversationId: string; userMessageId: string; assistantMessageId: string } | undefined
  > {
    const startMs = Date.now();
    let conversationId = data.conversationId;
    let userMessageId: string | undefined;
    let assistantMessageId: string | undefined;
    let provider: ProviderType | undefined;
    let usage: UsageData | undefined;

    // The Session is bound once it is known (a new conversation only gets its
    // id mid-request), so the model call's lines and the summary both carry it.
    const sessionLogger = (): ChatLogger =>
      conversationId === undefined
        ? logger
        : bindAttributes(logger, { 'nebula.session.id': conversationId });

    const summary = (): LogAttributes => ({
      'nebula.message.id': userMessageId,
      'nebula.reply.message.id': assistantMessageId,
      'gen_ai.provider.name': provider,
      'gen_ai.request.model': data.model,
      'gen_ai.usage.input_tokens': usage?.promptTokens,
      'gen_ai.usage.output_tokens': usage?.completionTokens,
      'nebula.duration_ms': Date.now() - startMs,
    });

    const { allowed, retryAfterMs } = rateLimiter.check(userId);
    if (!allowed) {
      const rateLimited = new TooManyRequestsError(
        `Rate limit exceeded. Retry after ${retryAfterMs}ms.`,
      );
      logEvent(
        componentLogger(sessionLogger(), 'chat'),
        'warn',
        'chat.reply.completed',
        { ...summary(), 'nebula.outcome': 'rate_limited', 'error.type': rateLimited.code },
        `Direct reply rate-limited · retry in ${retryAfterMs} ms`,
      );
      write(sseError(rateLimited.toEnvelope()));
      return;
    }

    try {
      if (data.messages.length !== 1) {
        throw new BadRequestError(`Expected one message, received ${data.messages.length}.`);
      }

      const userMessage = data.messages[0]!;
      const requestedModel = data.model;
      await validateChatRequest(conversationId, userMessage, userId, requestedModel);

      const result = await createUserMessage(
        conversationId,
        userMessage.content,
        userMessage.role,
        userId,
      );
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

      try {
        provider = getProviderForModel(requestedModel);
      } catch {
        throw new BadRequestError(`Unsupported model: ${requestedModel}`);
      }

      const apiKey = provider === 'openai' ? env.OPENAI_API_KEY : env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new MissingConfigurationError(
          provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY',
        );
      }

      const streamConfig: ChatStreamConfig = {
        provider,
        apiKey,
        systemPrompt: SYSTEM_PROMPT,
        history,
        userMessage: userMessage.content,
        model: requestedModel,
        logger: componentLogger(sessionLogger(), 'llm'),
      };

      let fullResponse = '';
      await streamChat(streamConfig, {
        onToken: (token) => {
          fullResponse += token;
          write(sseToken(token));
        },
        onUsage: (u) => {
          usage = u;
          write(sseUsage(u));
        },
      });

      if (!fullResponse.trim()) {
        throw new Error('The assistant did not generate a response.');
      }

      const assistantMessage = await messageService.createMessage(
        {
          conversationId,
          role: 'assistant',
          content: fullResponse,
          tokenCount: usage?.totalTokens ?? null,
        },
        userId,
      );
      assistantMessageId = assistantMessage.id;
      write(sseAssistantMessageCreated(assistantMessageId));

      logEvent(
        componentLogger(sessionLogger(), 'chat'),
        'info',
        'chat.reply.completed',
        { ...summary(), 'nebula.outcome': 'completed' },
        `Direct reply completed · ${requestedModel} · ${usage?.totalTokens ?? 0} tokens · ${((Date.now() - startMs) / 1000).toFixed(1)} s`,
      );

      return { conversationId, userMessageId, assistantMessageId };
    } catch (error) {
      // The hijacked reply bypasses the global error handler, so classify here:
      // an AppError speaks for itself, anything else is reported generically.
      const envelope = toErrorEnvelope(error);
      const callerCaused = isAppError(error) && error.status < 500;
      logEvent(
        componentLogger(sessionLogger(), 'chat'),
        callerCaused ? 'warn' : 'error',
        'chat.reply.completed',
        { ...summary(), 'nebula.outcome': 'failed', 'error.type': envelope.error, err: error },
        `Direct reply failed · ${envelope.error}`,
      );
      write(sseError(envelope));
    }
  },
};
