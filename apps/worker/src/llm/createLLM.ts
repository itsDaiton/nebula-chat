import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import { DEFAULT_MODELS } from '@worker/llm/modelRegistry';
import type { LLMConfig } from '@worker/llm/modelRegistry';

const createOpenAILLM = (config: LLMConfig): ChatOpenAI =>
  new ChatOpenAI({
    openAIApiKey: config.apiKey,
    modelName: config.model ?? DEFAULT_MODELS.openai,
    temperature: config.temperature ?? 0.7,
    ...(config.maxTokens !== undefined && { maxTokens: config.maxTokens }),
    streaming: config.streaming ?? false,
  });

const createAnthropicLLM = (config: LLMConfig): ChatAnthropic =>
  new ChatAnthropic({
    anthropicApiKey: config.apiKey,
    modelName: config.model ?? DEFAULT_MODELS.anthropic,
    temperature: config.temperature ?? 0.7,
    ...(config.maxTokens !== undefined && { maxTokens: config.maxTokens }),
    streaming: config.streaming ?? false,
  });

export const createLLM = (config: LLMConfig): BaseChatModel => {
  switch (config.provider) {
    case 'openai':
      return createOpenAILLM(config);
    case 'anthropic':
      return createAnthropicLLM(config);
    default:
      throw new Error(`Unsupported provider: ${String(config.provider)}`);
  }
};
