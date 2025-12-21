import { encoding_for_model } from 'tiktoken';
import type { TiktokenModel } from 'tiktoken';
import { chatConfig } from './chat.config';

let encoder: ReturnType<typeof encoding_for_model> | null = null;

function getEncoder() {
  if (!encoder) {
    encoder = encoding_for_model(chatConfig.tokenizer as TiktokenModel);
  }
  return encoder;
}

export function countTokens(text: string): number {
  const enc = getEncoder();
  const tokens = enc.encode(text);
  return tokens.length;
}

export function validateTokenLimit(
  text: string,
  limit: number,
): { isValid: boolean; tokens: number } {
  const tokens = countTokens(text);
  return {
    isValid: tokens <= limit,
    tokens,
  };
}

export function calculateContextTokens(
  messages: Array<{
    role: string;
    content: string;
    tokens?: unknown;
  }>,
): number {
  let totalTokens = 0;
  for (const message of messages) {
    totalTokens += countTokens(message.content);
  }
  const messageOverhead = messages.length * 4;
  const baseOverhead = 3;
  return totalTokens + messageOverhead + baseOverhead;
}

export function cleanupEncoder() {
  if (encoder) {
    encoder.free();
    encoder = null;
  }
}
