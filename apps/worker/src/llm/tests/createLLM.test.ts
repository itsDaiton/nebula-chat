import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { describe, expect, it } from 'vitest';
import { MODEL_CATALOG } from '@nebula-chat/contracts';
import { createLLM } from '@worker/llm/createLLM';
import type { LLMConfig } from '@worker/llm/createLLM';

const openai = (overrides: Partial<LLMConfig> = {}): LLMConfig => ({
  provider: 'openai',
  apiKey: 'sk-test',
  ...overrides,
});

const anthropic = (overrides: Partial<LLMConfig> = {}): LLMConfig => ({
  provider: 'anthropic',
  apiKey: 'sk-ant-test',
  ...overrides,
});

const openaiModel = (config: LLMConfig) => createLLM(config) as ChatOpenAI;

const anthropicModel = (config: LLMConfig) => createLLM(config) as ChatAnthropic;

describe('createLLM', () => {
  it('builds a ChatOpenAI for the openai provider', () => {
    expect(createLLM(openai())).toBeInstanceOf(ChatOpenAI);
  });

  it('builds a ChatAnthropic for the anthropic provider', () => {
    expect(createLLM(anthropic())).toBeInstanceOf(ChatAnthropic);
  });

  it('has a provider to build for every Model in the catalog', () => {
    for (const { id, provider } of MODEL_CATALOG) {
      expect(() => createLLM({ provider, apiKey: 'k', model: id }), id).not.toThrow();
    }
  });

  it('throws for a provider outside the supported union', () => {
    expect(() => createLLM({ provider: 'cohere', apiKey: 'k' } as unknown as LLMConfig)).toThrow(
      'Unsupported provider: cohere',
    );
  });
});

describe('createLLM for openai', () => {
  // ChatOpenAI accepts `modelName` as a constructor alias but exposes the
  // resolved value as `model`; ChatAnthropic still exposes `modelName`.
  it("defaults to the provider's default model", () => {
    expect(openaiModel(openai()).model).toBe('gpt-4o-mini');
  });

  it('honours an explicitly requested model', () => {
    expect(openaiModel(openai({ model: 'gpt-4o' })).model).toBe('gpt-4o');
  });

  it('defaults temperature to 0.7', () => {
    expect(openaiModel(openai()).temperature).toBe(0.7);
  });

  it('preserves an explicit temperature of 0 rather than treating it as unset', () => {
    expect(openaiModel(openai({ temperature: 0 })).temperature).toBe(0);
  });

  it('sends no temperature to a Model that fixes it, whatever was asked', () => {
    expect(
      openaiModel(openai({ model: 'gpt-5-mini', temperature: 0.2 })).temperature,
    ).toBeUndefined();
  });

  it('sends no default temperature to a Model that fixes it', () => {
    expect(openaiModel(openai({ model: 'gpt-5-mini' })).temperature).toBeUndefined();
  });

  it('defaults streaming to off', () => {
    expect(openaiModel(openai()).streaming).toBe(false);
  });

  it('enables streaming when asked', () => {
    expect(openaiModel(openai({ streaming: true })).streaming).toBe(true);
  });

  it('passes maxTokens through when set', () => {
    expect(openaiModel(openai({ maxTokens: 256 })).maxTokens).toBe(256);
  });
});

describe('createLLM for anthropic', () => {
  it("defaults to the provider's default model", () => {
    expect(anthropicModel(anthropic()).modelName).toBe('claude-3-5-haiku-20241022');
  });

  it('honours an explicitly requested model', () => {
    expect(anthropicModel(anthropic({ model: 'claude-3-opus-20240229' })).modelName).toBe(
      'claude-3-opus-20240229',
    );
  });

  it('defaults temperature to 0.7', () => {
    expect(anthropicModel(anthropic()).temperature).toBe(0.7);
  });

  it('preserves an explicit temperature of 0', () => {
    expect(anthropicModel(anthropic({ temperature: 0 })).temperature).toBe(0);
  });

  it('defaults streaming to off and enables it when asked', () => {
    expect(anthropicModel(anthropic()).streaming).toBe(false);
    expect(anthropicModel(anthropic({ streaming: true })).streaming).toBe(true);
  });
});
