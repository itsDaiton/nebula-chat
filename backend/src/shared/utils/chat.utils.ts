import 'dotenv/config';
import OpenAI from 'openai';

export const createClient: () => OpenAI = () => {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  return client;
};

export const validModels: string[] = [
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-5.1',
  'gpt-5',
  'gpt-5-mini',
];
