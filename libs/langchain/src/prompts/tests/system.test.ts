import { describe, expect, it } from 'vitest';
import { SYSTEM_PROMPTS } from '../system';

describe('SYSTEM_PROMPTS', () => {
  it('exposes a default prompt, which chat.chain falls back to', () => {
    expect(SYSTEM_PROMPTS.default).toBeTruthy();
  });

  it('maps every key to a non-empty string', () => {
    for (const [key, prompt] of Object.entries(SYSTEM_PROMPTS)) {
      expect(typeof prompt, key).toBe('string');
      expect(prompt.trim().length, key).toBeGreaterThan(0);
    }
  });

  it('has no duplicate prompt text across keys', () => {
    const values = Object.values(SYSTEM_PROMPTS);

    expect(new Set(values).size).toBe(values.length);
  });
});
