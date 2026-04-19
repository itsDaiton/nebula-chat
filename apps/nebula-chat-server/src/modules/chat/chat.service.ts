import 'dotenv/config';
import { prisma } from '@backend/prisma';
import type OpenAI from 'openai';
import type {
  CreateChatStreamDTO,
  StreamCallbacks,
  UsageData,
} from '@backend/modules/chat/chat.types';
import { messageService } from '@backend/modules/message/message.service';
import { messageRepository } from '@backend/modules/message/message.repository';
import type { CreateMessageDTO } from '@backend/modules/message/message.types';
import { conversationRepository } from '@backend/modules/conversation/conversation.repository';
import { createClient, getSystemPrompt } from '@backend/modules/chat/chat.utils';
import { chatConfig } from '@backend/modules/chat/chat.config';
import {
  validateTokenLimit,
  calculateContextTokens,
  countTokens,
} from '@backend/modules/chat/chat.tokenizer';
import {
  MissingConfigurationError,
  ClientInitializationError,
  NotFoundError,
  PayloadTooLargeError,
  BadRequestError,
} from '@backend/errors/AppError';

export const createUserMessage = async (
  conversationId: string | undefined,
  userMessageContent: string,
  userMessageRole: CreateMessageDTO['role'],
) => {
  let isNewConversation = false;

  const result = await prisma.$transaction(async (tx) => {
    let convId = conversationId;

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

    const newUserMessage = await messageRepository.createTx(tx, {
      conversationId: convId,
      role: userMessageRole,
      content: userMessageContent,
      model: null,
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
) => {
  if (userMessage.role !== 'user') {
    throw new BadRequestError(
      `Expected message with role 'user', received '${userMessage.role}'. Only user messages can be sent.`,
    );
  }

  const userMessageValidation = validateTokenLimit(
    userMessage.content,
    chatConfig.tokenLimits.maxPromptTokens,
  );

  if (!userMessageValidation.isValid) {
    throw new PayloadTooLargeError(
      `User message exceeds token limit. Message has ${userMessageValidation.tokens} tokens, maximum allowed is ${chatConfig.tokenLimits.maxPromptTokens} tokens.`,
    );
  }

  if (conversationId) {
    const existingConversation = await conversationRepository.findByIdSimple(conversationId);
    if (!existingConversation) {
      throw new NotFoundError('Conversation', conversationId);
    }

    const limit =
      chatConfig.maxHistoryMessages > 0 && Number.isFinite(chatConfig.maxHistoryMessages)
        ? chatConfig.maxHistoryMessages
        : undefined;

    const existingHistory = await messageRepository.findByConversationId(conversationId, limit);

    const systemPrompt = getSystemPrompt();
    const existingHistoryTokens = calculateContextTokens(existingHistory);
    const systemPromptTokens = countTokens(systemPrompt);
    const newUserMessageTokens = userMessageValidation.tokens;
    const messageOverhead = 4;
    const projectedTotalTokens =
      existingHistoryTokens + systemPromptTokens + newUserMessageTokens + messageOverhead;

    if (projectedTotalTokens > chatConfig.tokenLimits.maxContextTokens) {
      throw new PayloadTooLargeError(
        `Adding this message would exceed context token limit. Projected context: ${projectedTotalTokens} tokens, maximum allowed: ${chatConfig.tokenLimits.maxContextTokens} tokens. Consider starting a new conversation.`,
      );
    }
  }
};

const processOpenAIStream = async (
  stream: AsyncIterable<OpenAI.Chat.ChatCompletionChunk>,
  callbacks: Pick<StreamCallbacks, 'onToken' | 'onUsage'>,
): Promise<{ fullResponse: string; usageData: UsageData | null }> => {
  let fullResponse = '';
  let usageData: UsageData | null = null;

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (typeof delta === 'string') {
      fullResponse += delta;
      callbacks.onToken(delta);
    }
    if (chunk.usage) {
      usageData = {
        promptTokens: chunk.usage.prompt_tokens,
        completionTokens: chunk.usage.completion_tokens,
        totalTokens: chunk.usage.total_tokens,
      };
      callbacks.onUsage(usageData);
    }
  }

  return { fullResponse, usageData };
};

const executeStreamRequest = async (
  client: OpenAI,
  data: CreateChatStreamDTO,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  conversationId: string,
  callbacks: StreamCallbacks,
): Promise<string> => {
  try {
    const stream = await client.chat.completions.create({
      model: data.model,
      messages,
      stream: true,
      stream_options: { include_usage: true },
      max_completion_tokens: chatConfig.tokenLimits.maxCompletionTokens,
    });

    const { fullResponse, usageData } = await processOpenAIStream(
      stream as AsyncIterable<OpenAI.Chat.ChatCompletionChunk>,
      callbacks,
    );

    if (!fullResponse || fullResponse.trim().length === 0) {
      const emptyResponseMessage = 'The assistant did not generate a response.';
      const errorMsg = await messageService.createMessage({
        conversationId,
        role: 'assistant',
        content: emptyResponseMessage,
        model: data.model,
        tokens: usageData ?? undefined,
      });
      callbacks.onAssistantMessageCreated(errorMsg.id);
      throw new Error(emptyResponseMessage);
    }

    const assistantMessage = await messageService.createMessage({
      conversationId,
      role: 'assistant',
      content: fullResponse,
      model: data.model,
      tokens: usageData ?? undefined,
    });
    callbacks.onAssistantMessageCreated(assistantMessage.id);
    return assistantMessage.id;
  } catch (streamError) {
    throw streamError;
  }
};

export const chatService = {
  async streamResponse(data: CreateChatStreamDTO, callbacks: StreamCallbacks) {
    if (!process.env.OPENAI_API_KEY) {
      throw new MissingConfigurationError('OpenAI API key');
    }

    const client = createClient();

    if (!client) {
      throw new ClientInitializationError('OpenAI');
    }

    let conversationId = data.conversationId;
    let userMessageId: string | undefined;
    let assistantMessageId: string | undefined;

    try {
      if (data.messages.length !== 1) {
        throw new BadRequestError(`Expected one message, received ${data.messages.length}.`);
      }

      const userMessage = data.messages[0]!;

      await validateChatRequest(conversationId, userMessage);

      const result = await createUserMessage(conversationId, userMessage.content, userMessage.role);
      conversationId = result.conversationId;
      userMessageId = result.userMessageId;

      if (result.isNewConversation) {
        callbacks.onConversationCreated(conversationId);
      }
      callbacks.onUserMessageCreated(userMessageId);

      const limit =
        chatConfig.maxHistoryMessages > 0 && Number.isFinite(chatConfig.maxHistoryMessages)
          ? chatConfig.maxHistoryMessages
          : undefined;

      const conversationHistory = await messageRepository.findByConversationId(
        conversationId,
        limit,
      );

      const systemPrompt = getSystemPrompt();
      const messagesWithSystem: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.toReversed().map((msg) => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        })),
      ];

      assistantMessageId = await executeStreamRequest(
        client,
        data,
        messagesWithSystem,
        conversationId,
        callbacks,
      );

      return { conversationId, userMessageId, assistantMessageId };
    } catch (error) {
      callbacks.onError(error instanceof Error ? error.message : 'Unknown error occurred');
      return;
    }
  },
};
