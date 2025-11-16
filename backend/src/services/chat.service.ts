import 'dotenv/config';
import type { ChatHistoryRequestBody } from '@backend/types/chat.types';
import { createClient } from '@backend/utils/chat.utils';
import type OpenAI from 'openai';

export async function generateResponseStream(
  messages: ChatHistoryRequestBody['messages'],
  model: ChatHistoryRequestBody['model'],
  onToken: (token: string) => void,
  onUsage: (usageData: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }) => void,
): Promise<void> {
  const client: OpenAI = createClient();

  try {
    const stream = (await client.chat.completions.create({
      model,
      messages,
      stream: true,
      stream_options: {
        include_usage: true,
      },
    })) as AsyncIterable<OpenAI.Chat.ChatCompletionChunk>;

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta.length > 0) {
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
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error.');
    throw err;
  }
}
