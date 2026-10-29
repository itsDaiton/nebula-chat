import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import { DEFAULT_MODELS, findModel } from '@nebula-chat/contracts';
import type { ModelProvider } from '@nebula-chat/contracts';

export type LLMConfig = {
  provider: ModelProvider;
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
};

// A Model that fixes `temperature` rejects any value, so the key is left out instead of defaulted.
const temperatureFor = (model: string, temperature: number | undefined) =>
  findModel(model)?.supportsTemperature === false ? {} : { temperature: temperature ?? 0.7 };

const createOpenAILLM = (config: LLMConfig): ChatOpenAI => {
  const model = config.model ?? DEFAULT_MODELS.openai;
  return new ChatOpenAI({
    openAIApiKey: config.apiKey,
    modelName: model,
    ...temperatureFor(model, config.temperature),
    ...(config.maxTokens !== undefined && { maxTokens: config.maxTokens }),
    streaming: config.streaming ?? false,
  });
};

const createAnthropicLLM = (config: LLMConfig): ChatAnthropic => {
  const model = config.model ?? DEFAULT_MODELS.anthropic;
  return new ChatAnthropic({
    anthropicApiKey: config.apiKey,
    modelName: model,
    ...temperatureFor(model, config.temperature),
    ...(config.maxTokens !== undefined && { maxTokens: config.maxTokens }),
    streaming: config.streaming ?? false,
  });
};

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
