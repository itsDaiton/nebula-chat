import 'dotenv/config';
import OpenAI from 'openai';
import type { ChatRequestBody } from '@backend/types/chat.types';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateResponse(
  message: ChatRequestBody['message'],
  model: ChatRequestBody['model'],
): Promise<string> {
  try {
    const data = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: message }],
    });

    const response = data.choices?.[0]?.message?.content;

    if (!response || typeof response !== 'string') {
      throw new Error('Invalid response from OpenAI API.');
    }

    return response;
  } catch (error) {
    const err =
      error instanceof Error ? error.message : 'Unknown error occurred while generating response.';
    throw new Error(err);
  }
}
