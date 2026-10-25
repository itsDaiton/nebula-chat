import { describe, expect, it } from 'vitest';
import {
  MODEL_CATALOG,
  MODEL_IDS,
  findModel,
  getModel,
  modelIdSchema,
  modelProviderSchema,
} from '../modelCatalog';

describe('MODEL_CATALOG', () => {
  it('lists every Model once', () => {
    const ids = MODEL_CATALOG.map((model) => model.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('labels each Model for people, not by its id', () => {
    expect(getModel('gpt-4.1-mini').label).toBe('GPT-4.1 mini');
    for (const model of MODEL_CATALOG) {
      expect(model.label.trim(), model.id).not.toBe('');
    }
  });

  it('names a known provider for every Model', () => {
    for (const model of MODEL_CATALOG) {
      expect(modelProviderSchema.safeParse(model.provider).success, model.id).toBe(true);
    }
  });

  it('reserves less output than the context window for every Model', () => {
    for (const model of MODEL_CATALOG) {
      expect(model.maxOutput, model.id).toBeGreaterThan(0);
      expect(model.maxOutput, model.id).toBeLessThan(model.contextWindow);
    }
  });

  it('prices every Model, with cached input never above uncached input', () => {
    for (const { id, prices } of MODEL_CATALOG) {
      expect(prices.input, id).toBeGreaterThan(0);
      expect(prices.output, id).toBeGreaterThan(0);
      expect(prices.cachedInput, id).toBeGreaterThan(0);
      expect(prices.cachedInput, id).toBeLessThanOrEqual(prices.input);
    }
  });
});

describe('MODEL_IDS', () => {
  it('is the catalog ids in catalog order', () => {
    expect([...MODEL_IDS]).toEqual(MODEL_CATALOG.map((model) => model.id));
  });
});

describe('modelIdSchema', () => {
  it('accepts every Model in the catalog', () => {
    for (const { id } of MODEL_CATALOG) {
      expect(modelIdSchema.safeParse(id).success, id).toBe(true);
    }
  });

  it('rejects a Model that is not in the catalog', () => {
    expect(modelIdSchema.safeParse('gpt-9000').success).toBe(false);
  });
});

describe('findModel', () => {
  it('returns the catalog entry for a Model id', () => {
    expect(findModel('claude-3-5-haiku-20241022')).toMatchObject({
      provider: 'anthropic',
      label: 'Claude 3.5 Haiku',
    });
  });

  it('returns undefined for an unknown id', () => {
    expect(findModel('gpt-9000')).toBeUndefined();
  });
});

describe('getModel', () => {
  it('returns the catalog entry for a Model id', () => {
    expect(getModel('gpt-4o-mini').provider).toBe('openai');
  });

  it('throws a named error for an unknown id', () => {
    expect(() => getModel('gpt-9000')).toThrow('Unknown model: gpt-9000');
  });
});
