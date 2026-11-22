import { describe, expect, it } from 'vitest';
import { ownKeyRewrapJobSchema, ownKeyValidationJobSchema } from '../ownKeyJobs';

describe('ownKeyValidationJobSchema', () => {
  it('accepts the ID of a stored key', () => {
    const job = { ownKeyId: '66666666-6666-4666-8666-666666666666' };
    expect(ownKeyValidationJobSchema.parse(job)).toEqual(job);
  });

  it('rejects a payload without a key ID', () => {
    expect(ownKeyValidationJobSchema.safeParse({}).success).toBe(false);
  });
});

describe('ownKeyRewrapJobSchema', () => {
  it('accepts the empty payload', () => {
    expect(ownKeyRewrapJobSchema.safeParse({}).success).toBe(true);
  });
});
