import { describe, expect, it } from 'vitest';
import { MissingConfigurationError } from '@nebula-chat/errors';
import { operatorKeyResolver } from '@worker/llm/keyResolver';

describe('operatorKeyResolver', () => {
  const keys = operatorKeyResolver({ openai: 'sk-openai', anthropic: undefined });

  it('returns the Operator key of a configured provider', () => {
    expect(keys.keyFor('openai')).toBe('sk-openai');
  });

  it('throws MissingConfigurationError naming the env variable for an unconfigured provider', () => {
    expect(() => keys.keyFor('anthropic')).toThrow(MissingConfigurationError);
    expect(() => keys.keyFor('anthropic')).toThrow(/ANTHROPIC_API_KEY/);
  });

  it('lists only the key values that are configured', () => {
    expect(keys.knownKeys()).toEqual(['sk-openai']);
  });
});
