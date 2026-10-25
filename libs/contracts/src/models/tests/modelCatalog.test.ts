// The lib itself is Node-free (tsconfig has no node types); only this test hashes with node:crypto.
/// <reference types="node" />
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import catalogJson from '../catalog.json';
import {
  DEFAULT_MODELS,
  MODEL_CATALOG,
  MODEL_CATALOG_HASH,
  MODEL_CATALOG_VERSION,
  MODEL_IDS,
  findModel,
  getModel,
  modelCatalogSchema,
  modelIdSchema,
} from '../modelCatalog';

const aCatalog = () => ({
  version: '2026-10-25-3f2b8c1e-5d4a-4e7b-9a10-6c2d8e9f0a11',
  hash: 'a'.repeat(64),
  defaultModels: { openai: 'gpt-test', anthropic: 'claude-test' },
  models: [
    {
      id: 'gpt-test',
      label: 'GPT Test',
      provider: 'openai',
      contextWindow: 128_000,
      maxOutput: 4_096,
      prices: { input: 1, cachedInput: 0.5, output: 2 },
    },
    {
      id: 'claude-test',
      label: 'Claude Test',
      provider: 'anthropic',
      contextWindow: 200_000,
      maxOutput: 4_096,
      prices: { input: 3, cachedInput: 0.3, output: 15 },
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

  it('carries the version and hash of the file it was loaded from', () => {
    expect(MODEL_CATALOG_VERSION).toBe(catalogJson.version);
    expect(MODEL_CATALOG_HASH).toBe(catalogJson.hash);
  });

  it('hashes the Models and defaults, so a data edit without `pnpm catalog:stamp` fails here', () => {
    const content = JSON.stringify({
      defaultModels: catalogJson.defaultModels,
      models: catalogJson.models,
    });

    expect(createHash('sha256').update(content).digest('hex')).toBe(MODEL_CATALOG_HASH);
  });
});

describe('modelCatalogSchema', () => {
  it('accepts a well-formed catalog', () => {
    expect(modelCatalogSchema.safeParse(aCatalog()).success).toBe(true);
  });

  it.each([
    ['a version without a uuid', '2026-10-25'],
    ['a version that is only a uuid', '3f2b8c1e-5d4a-4e7b-9a10-6c2d8e9f0a11'],
    ['a version with an impossible date', '2026-13-45-3f2b8c1e-5d4a-4e7b-9a10-6c2d8e9f0a11'],
    ['a version with a malformed uuid', '2026-10-25-not-a-uuid'],
  ])('rejects %s', (_case, version) => {
    expect(modelCatalogSchema.safeParse({ ...aCatalog(), version }).success).toBe(false);
  });

  it.each([
    ['too short', 'abc123'],
    ['not hexadecimal', 'z'.repeat(64)],
  ])('rejects a hash that is %s', (_case, hash) => {
    expect(modelCatalogSchema.safeParse({ ...aCatalog(), hash }).success).toBe(false);
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

describe('DEFAULT_MODELS', () => {
  it('names a Model in the catalog for each provider, belonging to that provider', () => {
    for (const [provider, id] of Object.entries(DEFAULT_MODELS)) {
      expect(getModel(id).provider, provider).toBe(provider);
    }
  });

  it('rejects a catalog with no default for a provider', () => {
    const defaultModels = { openai: 'gpt-test' };

    expect(modelCatalogSchema.safeParse({ ...aCatalog(), defaultModels }).success).toBe(false);
  });

  it('rejects a default that is not in the catalog', () => {
    const catalog = aCatalog();
    catalog.defaultModels.openai = 'gpt-missing';

    expect(modelCatalogSchema.safeParse(catalog).success).toBe(false);
  });

  it('rejects a default that belongs to another provider', () => {
    const catalog = aCatalog();
    catalog.defaultModels.openai = 'claude-test';

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
