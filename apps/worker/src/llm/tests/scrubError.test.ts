import { describe, expect, it } from 'vitest';
import { REDACT_CENSOR } from '@nebula-chat/otel';
import { operatorKeyResolver } from '@worker/llm/keyResolver';
import { scrubError } from '@worker/llm/scrubError';

const keys = operatorKeyResolver({ openai: 'plain-secret-value' });

describe('scrubError', () => {
  it('scrubs the message and stack in place, keeping the error itself', () => {
    const error = new Error('bad key plain-secret-value');
    const thrown = (): never => {
      try {
        throw error;
      } catch (caught) {
        scrubError(caught, keys);
        throw caught;
      }
    };

    expect(thrown).toThrow(error);
    expect(error.message).toBe(`bad key ${REDACT_CENSOR}`);
    expect(error.stack).not.toContain('plain-secret-value');
  });

  it('scrubs the cause chain', () => {
    const error = new Error('outer', { cause: new Error('inner sk-proj-AbC123xyz987') });

    scrubError(error, keys);

    expect((error.cause as Error).message).toBe(`inner ${REDACT_CENSOR}`);
  });

  it('ignores a thrown value that is not an Error', () => {
    expect(() => scrubError('plain-secret-value', keys)).not.toThrow();
  });
});

describe('scrubError on an abort', () => {
  it('leaves an abort DOMException, whose message is a getter, intact', () => {
    const abort = new DOMException('aborted', 'AbortError');

    expect(() => scrubError(abort, keys)).not.toThrow();
    expect(abort.message).toBe('aborted');
  });

  it('scrubs a getter-only message', () => {
    const abort = new DOMException('stopped plain-secret-value', 'AbortError');

    scrubError(abort, keys);

    expect(abort.message).toBe(`stopped ${REDACT_CENSOR}`);
  });
});
