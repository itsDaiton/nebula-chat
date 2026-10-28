import { describe, expect, it } from 'vitest';
import { getModelLabel, modelOptions } from '@/modules/chat/utils/modelOptions';

describe('modelOptions', () => {
  it('offers at least one model', () => {
    expect(modelOptions.length).toBeGreaterThan(0);
  });

  it('gives every option a label and a value', () => {
    for (const item of modelOptions) {
      expect(item.label).toBeTruthy();
      expect(item.value).toBeTruthy();
    }
  });

  it('has no duplicate values', () => {
    const values = modelOptions.map((i) => i.value);

    expect(new Set(values).size).toBe(values.length);
  });

  it('includes the default model the store starts on', () => {
    expect(modelOptions.some((i) => i.value === 'gpt-4o-mini')).toBe(true);
  });
});

describe('getModelLabel', () => {
  it('names a listed Model', () => {
    expect(getModelLabel('gpt-4.1-mini')).toBe('GPT-4.1 mini');
  });

  it('shows an unlisted id as itself', () => {
    expect(getModelLabel('gpt-9')).toBe('gpt-9');
  });
});
