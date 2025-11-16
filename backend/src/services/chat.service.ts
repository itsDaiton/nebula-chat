import 'dotenv/config';
import type { ChatHistoryRequestBody } from '@backend/types/chat.types';
import { createClient } from '@backend/utils/chat.utils';
import type OpenAI from 'openai';

export async function generateResponseStream(
  messages: ChatHistoryRequestBody['messages'],
  model: ChatHistoryRequestBody['model'],
  onToken: (token: string) => void,
): Promise<void> {
  const client: OpenAI = createClient();

  try {
    const stream = await client.chat.completions.create({
      model,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta.length > 0) {
        onToken(delta);
      }
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error.');
    throw err;
  }
}
