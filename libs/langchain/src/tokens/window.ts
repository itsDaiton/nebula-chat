import type { BaseMessage } from '@langchain/core/messages';
import { countTokens } from './counter';

export type WindowLimits = {
  maxInputTokens: number;
  model?: string;
  systemPrompt?: string;
  userMessage?: string;
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
    const msgTokens = countTokens(history[i].content as string, model);
    if (msgTokens > budget) break;
    result.unshift(history[i]);
    budget -= msgTokens;
  }

  return result;
};
