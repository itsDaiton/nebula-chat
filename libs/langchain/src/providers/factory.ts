import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LLMConfig } from './types';
import { createOpenAILLM } from './openai';
import { createAnthropicLLM } from './anthropic';

export const createLLM = (config: LLMConfig): BaseChatModel => {
  switch (config.provider) {
    case 'openai':
      return createOpenAILLM(config);
    case 'anthropic':
      return createAnthropicLLM(config);
  }
};
