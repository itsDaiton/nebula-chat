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
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing API key for OpenAI inference.');
  }

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
    throw error;
  }
}
