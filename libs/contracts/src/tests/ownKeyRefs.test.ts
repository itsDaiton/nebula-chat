import { describe, expect, it } from 'vitest';
import { directReplyJobSchema } from '../directReplyJob';
import { ownKeyRefsSchema } from '../ownKeyRefs';
import { runJobSchema } from '../runJob';

const REF = '66666666-6666-4666-8666-666666666666';
const ids = {
  userId: '11111111-1111-4111-8111-111111111111',
  sessionId: '22222222-2222-4222-8222-222222222222',
  messageId: '33333333-3333-4333-8333-333333333333',
  streamId: '44444444-4444-4444-8444-444444444444',
};
const run = { ...ids, runId: '55555555-5555-4555-8555-555555555555' };

describe('ownKeyRefsSchema', () => {
  it('accepts a reference per provider, either alone', () => {
    expect(ownKeyRefsSchema.parse({ openai: REF })).toEqual({ openai: REF });
    expect(ownKeyRefsSchema.parse({ anthropic: REF })).toEqual({ anthropic: REF });
  });

  it('rejects a provider the catalog does not know and a reference that is not an ID', () => {
    expect(ownKeyRefsSchema.safeParse({ mistral: REF }).success).toBe(false);
    expect(ownKeyRefsSchema.safeParse({ openai: 'sk-not-an-id' }).success).toBe(false);
  });
});

describe('job payloads', () => {
  it('still parse without key references', () => {
    expect(directReplyJobSchema.parse(ids)).toEqual(ids);
    expect(runJobSchema.parse(run)).toEqual(run);
  });

  it('carry key references when present', () => {
    const keyRefs = { openai: REF };
    expect(directReplyJobSchema.parse({ ...ids, keyRefs }).keyRefs).toEqual(keyRefs);
    expect(runJobSchema.parse({ ...run, keyRefs }).keyRefs).toEqual(keyRefs);
  });
});
