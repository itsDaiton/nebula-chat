import 'dotenv/config';
import type { CreateChatStreamDTO } from '@backend/modules/chat/chat.types';
import { createClient } from '@backend/modules/chat/chat.utils';
import type OpenAI from 'openai';
import { MissingConfigurationError, ClientInitializationError } from '@backend/errors/AppError';

export const chatService = {
  async streamResponse(
    data: CreateChatStreamDTO,
    onToken: (token: string) => void,
    onUsage: (usageData: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    }) => void,
  ) {
    if (!process.env.OPENAI_API_KEY) {
      throw new MissingConfigurationError('OpenAI API key');
    }

    const client = createClient();

    if (!client) {
      throw new ClientInitializationError('OpenAI');
    }

    const stream = await client.chat.completions.create({
      model: data.model,
      messages: data.messages,
      stream: true,
      stream_options: {
        include_usage: true,
      },
    });

    for await (const chunk of stream as AsyncIterable<OpenAI.Chat.ChatCompletionChunk>) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (typeof delta === 'string') {
        onToken(delta);
      }
      if (chunk.usage) {
        onUsage({
          promptTokens: chunk.usage.prompt_tokens,
          completionTokens: chunk.usage.completion_tokens,
          totalTokens: chunk.usage.total_tokens,
        });
      }
    }
  },
};
