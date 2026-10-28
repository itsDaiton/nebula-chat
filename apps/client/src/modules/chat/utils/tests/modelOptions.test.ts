import { describe, expect, it } from 'vitest';
import {
  formatContextWindow,
  getModelLabel,
  modelOptions,
} from '@/modules/chat/utils/modelOptions';

describe('modelOptions', () => {
  it('offers at least one model', () => {
    expect(modelOptions.length).toBeGreaterThan(0);
  });

  it('gives every option a label, a value, a provider and a context window', () => {
    for (const item of modelOptions) {
      expect(item.label).toBeTruthy();
      expect(item.value).toBeTruthy();
      expect(item.provider).toBeTruthy();
      expect(item.contextWindow).toBeGreaterThan(0);
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

describe('formatContextWindow', () => {
  it('abbreviates to K and M', () => {
    expect(formatContextWindow(128_000)).toBe('128K');
    expect(formatContextWindow(400_000)).toBe('400K');
    expect(formatContextWindow(1_047_576)).toBe('1M');
  });
});
