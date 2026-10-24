import { describe, it, expect } from 'vitest';
import { hashText, buildKey, streamCancelKey, streamEndedKey, streamKey } from '../keys';

describe('hashText', () => {
  it('is deterministic for the same input', () => {
    expect(hashText('hello')).toBe(hashText('hello'));
  });

  it('differs for different input', () => {
    expect(hashText('hello')).not.toBe(hashText('world'));
  });

  it('defaults to a 16-character digest', () => {
    expect(hashText('hello')).toHaveLength(16);
  });

  it('respects a custom length', () => {
    expect(hashText('hello', 8)).toHaveLength(8);
  });
});

describe('buildKey', () => {
  it('joins parts with colons', () => {
    expect(buildKey('session', 'abc', 'model', 'gpt-4o-mini')).toBe(
      'session:abc:model:gpt-4o-mini',
    );
  });

  it('coerces numeric parts', () => {
    expect(buildKey('page', 2)).toBe('page:2');
  });
});

describe('streamKey', () => {
  it('namespaces a reply stream under `stream:`', () => {
    expect(streamKey('abc')).toBe('stream:abc');
  });
});

describe('reply stream flags', () => {
  it('keeps a stream’s cancel and ended flags apart from the stream and each other', () => {
    expect(streamCancelKey('abc')).toBe('stream-cancel:abc');
    expect(streamEndedKey('abc')).toBe('stream-ended:abc');
  });
});
