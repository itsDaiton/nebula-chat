import { describe, expect, it } from 'vitest';
import { DEFAULT_MODELS, MODEL_REGISTRY, getProviderForModel } from './types';

describe('getProviderForModel', () => {
  it('resolves an OpenAI model to the openai provider', () => {
    expect(getProviderForModel('gpt-4o-mini')).toBe('openai');
  });

  it('resolves an Anthropic model to the anthropic provider', () => {
    expect(getProviderForModel('claude-3-5-haiku-20241022')).toBe('anthropic');
  });

  it('throws a named error for an unknown model', () => {
    expect(() => getProviderForModel('gpt-9000')).toThrow('Unknown model: gpt-9000');
  });
});

describe('MODEL_REGISTRY', () => {
  it('reserves less output than the context window for every model', () => {
    for (const [model, entry] of Object.entries(MODEL_REGISTRY)) {
      expect(entry.defaultMaxOutput, model).toBeLessThan(entry.contextWindow);
    }
  });

  it('gives every model a positive context window and output budget', () => {
    for (const [model, entry] of Object.entries(MODEL_REGISTRY)) {
      expect(entry.contextWindow, model).toBeGreaterThan(0);
      expect(entry.defaultMaxOutput, model).toBeGreaterThan(0);
    }
  });

  it('declares a known provider for every model', () => {
    for (const [model, entry] of Object.entries(MODEL_REGISTRY)) {
      expect(['openai', 'anthropic'], model).toContain(entry.provider);
    }
  });
});

describe('DEFAULT_MODELS', () => {
  it('names a registered model for each provider', () => {
    for (const [provider, model] of Object.entries(DEFAULT_MODELS)) {
      expect(MODEL_REGISTRY[model], provider).toBeDefined();
    }
  });

  it("points each provider's default at a model belonging to that provider", () => {
    for (const [provider, model] of Object.entries(DEFAULT_MODELS)) {
      expect(getProviderForModel(model)).toBe(provider);
    }
  });
});
