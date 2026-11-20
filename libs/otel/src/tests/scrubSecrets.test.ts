import { describe, expect, it } from 'vitest';
import { REDACT_CENSOR } from '../redaction';
import { scrubSecrets } from '../scrubSecrets';

describe('scrubSecrets', () => {
  it.each([
    ['an OpenAI key', 'Incorrect API key provided: sk-abcdefghijklmnop1234.'],
    ['an OpenAI project key', 'Incorrect API key provided: sk-proj-AbC_123-xyz.'],
    ['an Anthropic key', 'invalid x-api-key sk-ant-api03-AbC_123-xyz'],
    ['a masked key', 'Incorrect API key provided: sk-proj-********abcd.'],
    ['a truncated key', 'Incorrect API key provided: sk-...abc.'],
  ])('censors %s', (_label, text) => {
    const scrubbed = scrubSecrets(text);
    expect(scrubbed).toContain(REDACT_CENSOR);
    expect(scrubbed).not.toMatch(/sk-/);
  });

  it('censors an exact known value wherever it appears', () => {
    expect(scrubSecrets('bad token my-secret-value in the middle', ['my-secret-value'])).toBe(
      `bad token ${REDACT_CENSOR} in the middle`,
    );
  });

  it('censors every occurrence and ignores an empty known value', () => {
    expect(scrubSecrets('abc abc', ['abc', ''])).toBe(`${REDACT_CENSOR} ${REDACT_CENSOR}`);
  });

  it('leaves text with no key unchanged', () => {
    const text = 'Rate limit reached for the task-runner and the risk-free disk';
    expect(scrubSecrets(text, ['sk-known-value'])).toBe(text);
  });
});
