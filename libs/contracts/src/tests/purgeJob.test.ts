import { describe, expect, it } from 'vitest';
import { purgeJobSchema } from '../purgeJob';

describe('purgeJobSchema', () => {
  it('accepts the empty payload the scheduler enqueues', () => {
    expect(purgeJobSchema.safeParse({}).success).toBe(true);
  });

  it('rejects a payload that is not an object', () => {
    expect(purgeJobSchema.safeParse('nope').success).toBe(false);
  });
});
