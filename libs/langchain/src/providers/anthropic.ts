import { ChatAnthropic } from '@langchain/anthropic';
import type { LLMConfig } from './types';
import { DEFAULT_MODELS } from './types';

export const createAnthropicLLM = (config: LLMConfig): ChatAnthropic =>
  new ChatAnthropic({
    anthropicApiKey: config.apiKey,
    modelName: config.model ?? DEFAULT_MODELS.anthropic,
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens,
    streaming: config.streaming ?? false,
  });
