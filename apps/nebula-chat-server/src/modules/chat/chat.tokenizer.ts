import { encoding_for_model } from 'tiktoken';
import type { TiktokenModel } from 'tiktoken';
import { chatConfig } from '@backend/modules/chat/chat.config';

let encoder: ReturnType<typeof encoding_for_model> | null = null;

const getEncoder = () => {
  encoder ??= encoding_for_model(chatConfig.tokenizer as TiktokenModel);
  return encoder;
};

export const countTokens = (text: string): number => {
  const enc = getEncoder();
  const tokens = enc.encode(text);
  return tokens.length;
};

export const validateTokenLimit = (
  text: string,
  limit: number,
): { isValid: boolean; tokens: number } => {
  const tokens = countTokens(text);
  return {
    isValid: tokens <= limit,
    tokens,
  };
};

export const calculateContextTokens = (
  messages: Array<{
    role: string;
    content: string;
    tokens?: unknown;
  }>,
): number => {
  let totalTokens = 0;
  for (const message of messages) {
    totalTokens += countTokens(message.content);
  }
  const messageOverhead = messages.length * 4;
  const baseOverhead = 3;
  return totalTokens + messageOverhead + baseOverhead;
};
