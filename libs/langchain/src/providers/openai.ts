import { ChatOpenAI } from '@langchain/openai';
import type { LLMConfig } from './types';
import { DEFAULT_MODELS } from './types';

export const createOpenAILLM = (config: LLMConfig): ChatOpenAI =>
  new ChatOpenAI({
    openAIApiKey: config.apiKey,
    modelName: config.model ?? DEFAULT_MODELS.openai,
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens,
    streaming: config.streaming ?? false,
  });
