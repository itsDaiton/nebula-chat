import { describe, expect, it } from 'vitest';
import { modelOptions } from '@/modules/chat/utils/modelOptions';

describe('modelOptions', () => {
  it('offers at least one model', () => {
    expect(modelOptions.items.length).toBeGreaterThan(0);
  });

  it('gives every option a label and a value', () => {
    for (const item of modelOptions.items) {
      expect(item.label).toBeTruthy();
      expect(item.value).toBeTruthy();
    }
  });

  it('has no duplicate values', () => {
    const values = modelOptions.items.map((i) => i.value);

    expect(new Set(values).size).toBe(values.length);
  });

  it('includes the default model the store starts on', () => {
    expect(modelOptions.items.some((i) => i.value === 'gpt-4o-mini')).toBe(true);
  });
});
