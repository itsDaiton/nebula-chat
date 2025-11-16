import 'dotenv/config';
import type { ChatRequestBody } from '@backend/types/chat.types';
import { createClient } from '@backend/utils/chat.utils';
import type OpenAI from 'openai';

export async function generateResponseStream(
  message: ChatRequestBody['message'],
  model: ChatRequestBody['model'],
  onToken: (token: string) => void,
): Promise<void> {
  const client: OpenAI = createClient();

  try {
    const stream = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: message }],
      stream: true,
    });

    for await (const chunk of stream) {
      const token = chunk.choices?.[0]?.delta?.content;
      if (token) {
        onToken(token);
      }
    }
  } catch (error) {
    throw error;
  }
}
