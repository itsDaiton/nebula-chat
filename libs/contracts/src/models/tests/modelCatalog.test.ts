import { describe, expect, it } from 'vitest';
import {
  MODEL_CATALOG,
  MODEL_CATALOG_VERSION,
  MODEL_IDS,
  findModel,
  getModel,
  modelCatalogSchema,
  modelIdSchema,
} from '../modelCatalog';

const aCatalog = () => ({
  version: 1,
  checkedAt: '2026-10-25',
  models: [
    {
      id: 'gpt-test',
      label: 'GPT Test',
      provider: 'openai',
      contextWindow: 128_000,
      maxOutput: 4_096,
      prices: { input: 1, cachedInput: 0.5, output: 2 },
    },
  ],
});

describe('MODEL_CATALOG', () => {
  it('labels each Model for people, not by its id', () => {
    expect(getModel('gpt-4.1-mini').label).toBe('GPT-4.1 mini');
    for (const model of MODEL_CATALOG) {
      expect(model.label.trim(), model.id).not.toBe('');
    }
  });

  it('carries a version for the file it was loaded from', () => {
    expect(Number.isInteger(MODEL_CATALOG_VERSION)).toBe(true);
    expect(MODEL_CATALOG_VERSION).toBeGreaterThan(0);
  });
});

describe('modelCatalogSchema', () => {
  it('accepts a well-formed catalog', () => {
    expect(modelCatalogSchema.safeParse(aCatalog()).success).toBe(true);
  });

  it('rejects a version that is not a positive whole number', () => {
    expect(modelCatalogSchema.safeParse({ ...aCatalog(), version: 0 }).success).toBe(false);
    expect(modelCatalogSchema.safeParse({ ...aCatalog(), version: 1.5 }).success).toBe(false);
  });

  it('rejects a checkedAt that is not a calendar date', () => {
    expect(modelCatalogSchema.safeParse({ ...aCatalog(), checkedAt: 'last week' }).success).toBe(
      false,
    );
  });

  it('rejects an empty catalog', () => {
    expect(modelCatalogSchema.safeParse({ ...aCatalog(), models: [] }).success).toBe(false);
  });

  it('rejects a provider the worker has no factory for', () => {
    const catalog = aCatalog();
    catalog.models[0]!.provider = 'cohere';

    expect(modelCatalogSchema.safeParse(catalog).success).toBe(false);
  });

  it('rejects a Model listed twice', () => {
    const catalog = aCatalog();
    catalog.models.push({ ...catalog.models[0]! });

    expect(modelCatalogSchema.safeParse(catalog).success).toBe(false);
  });

  it('rejects a Model with a missing price', () => {
    const catalog = aCatalog();
    const model = { ...catalog.models[0]!, prices: { input: 1, output: 2 } };

    expect(modelCatalogSchema.safeParse({ ...catalog, models: [model] }).success).toBe(false);
  });

  it('rejects a price that is zero or negative', () => {
    const catalog = aCatalog();
    catalog.models[0]!.prices.output = 0;

    expect(modelCatalogSchema.safeParse(catalog).success).toBe(false);
  });

  it('rejects cached input priced above uncached input', () => {
    const catalog = aCatalog();
    catalog.models[0]!.prices.cachedInput = 5;

    expect(modelCatalogSchema.safeParse(catalog).success).toBe(false);
  });

  it('rejects a reserved output that leaves no room in the context window', () => {
    const catalog = aCatalog();
    catalog.models[0]!.maxOutput = catalog.models[0]!.contextWindow;

    expect(modelCatalogSchema.safeParse(catalog).success).toBe(false);
  });

  it('rejects a Model with an empty label', () => {
    const catalog = aCatalog();
    catalog.models[0]!.label = ' ';

    expect(modelCatalogSchema.safeParse(catalog).success).toBe(false);
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
