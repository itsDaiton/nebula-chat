import 'dotenv/config';
import { prisma } from '@backend/prisma';
import type OpenAI from 'openai';
import type { CreateChatStreamDTO, StreamCallbacks } from '@backend/modules/chat/chat.types';
import { messageService } from '@backend/modules/message/message.service';
import { createClient } from '@backend/modules/chat/chat.utils';
import {
  MissingConfigurationError,
  ClientInitializationError,
  NotFoundError,
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
          const firstUserMessage = data.messages.find((m) => m.role === 'user');
          const title = firstUserMessage?.content.slice(0, 50) || 'New Chat';
          const newConversation = await tx.conversation.create({
            data: { title },
          });
          convId = newConversation.id;
          isNewConversation = true;
        }

        const lastUserMessage = data.messages[data.messages.length - 1];
        if (!lastUserMessage) {
          throw new NotFoundError('No messages provided');
        }
        const userMessage = await tx.message.create({
          data: {
            conversationId: convId,
            role: lastUserMessage.role,
            content: lastUserMessage.content,
          },
        });
        return {
          conversationId: convId,
          userMessageId: userMessage.id,
        };
      });

      conversationId = result.conversationId;
      userMessageId = result.userMessageId;
      if (isNewConversation) {
        callbacks.onConversationCreated(conversationId);
      }
      callbacks.onUserMessageCreated(userMessageId);

      const conversationHistory = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        select: {
          role: true,
          content: true,
        },
      });

      const messagesWithContext = conversationHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));

      let fullResponse = '';
      let usageData: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      } | null = null;

      const stream = await client.chat.completions.create({
        model: data.model,
        messages: messagesWithContext,
        stream: true,
        stream_options: {
          include_usage: true,
        },
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

      const assistantMessage = await messageService.createMessage({
        conversationId,
        role: 'assistant',
        content: fullResponse,
        tokens: usageData || undefined,
      });
      assistantMessageId = assistantMessage.id;

      callbacks.onAssistantMessageCreated(assistantMessageId);

      return {
        conversationId,
        userMessageId,
        assistantMessageId,
      };
    } catch (error) {
      callbacks.onError(error instanceof Error ? error.message : 'Unknown error occurred');
      throw error;
    }
  },
};
