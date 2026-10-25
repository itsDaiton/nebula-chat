import { describe, expect, it } from 'vitest';
import { getModel } from '@nebula-chat/contracts';
import { DEFAULT_MODELS } from '@worker/llm/modelRegistry';

describe('DEFAULT_MODELS', () => {
  it('names a Model in the catalog for each provider', () => {
    for (const [provider, model] of Object.entries(DEFAULT_MODELS)) {
      expect(() => getModel(model), provider).not.toThrow();
    }
  });

  it("points each provider's default at a Model belonging to that provider", () => {
    for (const [provider, model] of Object.entries(DEFAULT_MODELS)) {
      expect(getModel(model).provider).toBe(provider);
    }
  });
});
