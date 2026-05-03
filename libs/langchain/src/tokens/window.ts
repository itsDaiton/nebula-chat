import type { BaseMessage } from '@langchain/core/messages';
import { countTokens } from './counter';

export type WindowLimits = {
  maxInputTokens: number;
  model?: string;
  systemPrompt?: string;
  userMessage?: string;
};

type ContentBlock = { type?: string; text?: string } | string;

const normalizeMessageContent = (content: BaseMessage['content']): string => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part: ContentBlock) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && typeof part.text === 'string') return part.text;
        return '';
      })
      .join('');
  }

  if (content && typeof content === 'object' && 'text' in content) {
    const maybeText = (content as { text?: string }).text;
    return typeof maybeText === 'string' ? maybeText : '';
  }

  return '';
};

// Returns the longest suffix of history that fits within maxInputTokens
// after reserving space for the system prompt and the new user message.
export const packHistory = (history: BaseMessage[], limits: WindowLimits): BaseMessage[] => {
  const { maxInputTokens, model, systemPrompt = '', userMessage = '' } = limits;

  const fixedTokens = countTokens(systemPrompt, model) + countTokens(userMessage, model);

  let budget = maxInputTokens - fixedTokens;
  if (budget <= 0) return [];

  const result: BaseMessage[] = [];

  // Walk backwards — most recent messages have priority
  for (let i = history.length - 1; i >= 0; i--) {
    const msgTokens = countTokens(normalizeMessageContent(history[i].content), model);
    if (msgTokens > budget) break;
    result.unshift(history[i]);
    budget -= msgTokens;
  }

  return result;
};

export const getMessageContentText = (message: BaseMessage): string =>
  normalizeMessageContent(message.content);
