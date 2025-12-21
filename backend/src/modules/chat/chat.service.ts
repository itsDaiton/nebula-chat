import 'dotenv/config';
import { prisma } from '@backend/prisma';
import type OpenAI from 'openai';
import type { CreateChatStreamDTO, StreamCallbacks } from '@backend/modules/chat/chat.types';
import { messageService } from '@backend/modules/message/message.service';
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
    let isNewConversation = false;
    let userMessageId: string | undefined;
    let assistantMessageId: string | undefined;

    try {
      if (data.messages.length !== 1) {
        throw new BadRequestError(`Expected one message, received ${data.messages.length}.`);
      }

      const userMessage = data.messages[0]!;

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

      // Pre-validate context tokens BEFORE persisting to avoid orphaned messages
      // Fetch existing conversation history to calculate what the total context would be
      const tempConversationId = conversationId;

      // If no conversation ID, we need to create one temporarily to fetch history
      // But since it's a new conversation, history will be empty anyway
      if (tempConversationId) {
        const existingConversation = await prisma.conversation.findUnique({
          where: { id: tempConversationId },
        });
        if (!existingConversation) {
          throw new NotFoundError('Conversation', tempConversationId);
        }

        const limit =
          chatConfig.maxHistoryMessages > 0 && isFinite(chatConfig.maxHistoryMessages)
            ? chatConfig.maxHistoryMessages
            : undefined;

        const existingHistory = await prisma.message.findMany({
          where: { conversationId: tempConversationId },
          orderBy: { createdAt: 'desc' },
          ...(limit !== undefined && { take: limit }),
          select: {
            role: true,
            content: true,
            tokens: true,
          },
        });

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

      const result = await prisma.$transaction(async (tx) => {
        let convId = conversationId;

        if (convId) {
          const existingConversation = await tx.conversation.findUnique({
            where: { id: convId },
          });
          if (!existingConversation) {
            throw new NotFoundError('Conversation', convId);
          }
        } else {
          const title = userMessage.content.slice(0, 50) || 'New Chat';
          const newConversation = await tx.conversation.create({
            data: { title },
          });
          convId = newConversation.id;
          isNewConversation = true;
        }

        const newUserMessage = await tx.message.create({
          data: {
            conversationId: convId,
            role: userMessage.role,
            content: userMessage.content,
          },
        });
        return {
          conversationId: convId,
          userMessageId: newUserMessage.id,
        };
      });

      conversationId = result.conversationId;
      userMessageId = result.userMessageId;
      if (isNewConversation) {
        callbacks.onConversationCreated(conversationId);
      }
      callbacks.onUserMessageCreated(userMessageId);

      const limit =
        chatConfig.maxHistoryMessages > 0 && isFinite(chatConfig.maxHistoryMessages)
          ? chatConfig.maxHistoryMessages
          : undefined;

      const conversationHistory = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        ...(limit !== undefined && { take: limit }),
        select: {
          role: true,
          content: true,
          tokens: true,
        },
      });

      const systemPrompt = getSystemPrompt();

      const messagesWithContext = conversationHistory.reverse().map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));

      const messagesWithSystem = [
        { role: 'system' as const, content: systemPrompt },
        ...messagesWithContext,
      ];

      let fullResponse = '';
      let usageData: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      } | null = null;

      try {
        const stream = await client.chat.completions.create({
          model: data.model,
          messages: messagesWithSystem,
          stream: true,
          stream_options: {
            include_usage: true,
          },
          max_completion_tokens: chatConfig.tokenLimits.maxCompletionTokens,
        });

        for await (const chunk of stream as AsyncIterable<OpenAI.Chat.ChatCompletionChunk>) {
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

        if (!fullResponse || fullResponse.trim().length === 0) {
          const emptyResponseMessage = 'The assistant did not generate a response.';
          const errorAssistantMessage = await messageService.createMessage({
            conversationId,
            role: 'assistant',
            content: emptyResponseMessage,
            tokens: usageData || undefined,
          });
          assistantMessageId = errorAssistantMessage.id;

          callbacks.onError(emptyResponseMessage);
          callbacks.onAssistantMessageCreated(assistantMessageId);

          throw new Error('Stream completed without generating any content');
        }

        const assistantMessage = await messageService.createMessage({
          conversationId,
          role: 'assistant',
          content: fullResponse,
          tokens: usageData || undefined,
        });
        assistantMessageId = assistantMessage.id;

        callbacks.onAssistantMessageCreated(assistantMessageId);
      } catch (streamError) {
        const errorMessage =
          streamError instanceof Error
            ? `Stream error: ${streamError.message}`
            : 'Unexpected stream error occurred';

        const errorAssistantMessage = await messageService.createMessage({
          conversationId,
          role: 'assistant',
          content: errorMessage,
          tokens: undefined,
        });
        assistantMessageId = errorAssistantMessage.id;

        callbacks.onError(errorMessage);
        callbacks.onAssistantMessageCreated(assistantMessageId);

        throw streamError;
      }

      return {
        conversationId,
        userMessageId,
        assistantMessageId,
      };
    } catch (error) {
      callbacks.onError(error instanceof Error ? error.message : 'Unknown error occurred');
      return;
    }
  },
};
