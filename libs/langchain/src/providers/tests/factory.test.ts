import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { describe, expect, it } from 'vitest';
import { createLLM } from '../factory';
import { createAnthropicLLM } from '../anthropic';
import { createOpenAILLM } from '../openai';
import type { LLMConfig } from '../types';

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

describe('createLLM', () => {
  it('builds a ChatOpenAI for the openai provider', () => {
    expect(createLLM(openai())).toBeInstanceOf(ChatOpenAI);
  });

  it('builds a ChatAnthropic for the anthropic provider', () => {
    expect(createLLM(anthropic())).toBeInstanceOf(ChatAnthropic);
  });

  it('throws for a provider outside the supported union', () => {
    expect(() => createLLM({ provider: 'cohere', apiKey: 'k' } as unknown as LLMConfig)).toThrow(
      'Unsupported provider: cohere',
    );
  });
});

describe('createOpenAILLM', () => {
  // ChatOpenAI accepts `modelName` as a constructor alias but exposes the
  // resolved value as `model`; ChatAnthropic still exposes `modelName`.
  it("defaults to the provider's default model", () => {
    expect(createOpenAILLM(openai()).model).toBe('gpt-4o-mini');
  });

  it('honours an explicitly requested model', () => {
    expect(createOpenAILLM(openai({ model: 'gpt-4o' })).model).toBe('gpt-4o');
  });

  it('defaults temperature to 0.7', () => {
    expect(createOpenAILLM(openai()).temperature).toBe(0.7);
  });

  it('preserves an explicit temperature of 0 rather than treating it as unset', () => {
    expect(createOpenAILLM(openai({ temperature: 0 })).temperature).toBe(0);
  });

  it('defaults streaming to off', () => {
    expect(createOpenAILLM(openai()).streaming).toBe(false);
  });

  it('enables streaming when asked', () => {
    expect(createOpenAILLM(openai({ streaming: true })).streaming).toBe(true);
  });

  it('passes maxTokens through when set', () => {
    expect(createOpenAILLM(openai({ maxTokens: 256 })).maxTokens).toBe(256);
  });
});

describe('createAnthropicLLM', () => {
  it("defaults to the provider's default model", () => {
    expect(createAnthropicLLM(anthropic()).modelName).toBe('claude-3-5-haiku-20241022');
  });

  it('honours an explicitly requested model', () => {
    expect(createAnthropicLLM(anthropic({ model: 'claude-3-opus-20240229' })).modelName).toBe(
      'claude-3-opus-20240229',
    );
  });

  it('defaults temperature to 0.7', () => {
    expect(createAnthropicLLM(anthropic()).temperature).toBe(0.7);
  });

  it('preserves an explicit temperature of 0', () => {
    expect(createAnthropicLLM(anthropic({ temperature: 0 })).temperature).toBe(0);
  });

  it('defaults streaming to off and enables it when asked', () => {
    expect(createAnthropicLLM(anthropic()).streaming).toBe(false);
    expect(createAnthropicLLM(anthropic({ streaming: true })).streaming).toBe(true);
  });
});
