import { describe, expect, it } from 'vitest';
import {
  clarifyingQuestionTimeoutJobId,
  clarifyingQuestionTimeoutJobSchema,
} from '../clarifyingQuestionTimeoutJob';

const runId = '55555555-5555-4555-8555-555555555555';

describe('clarifyingQuestionTimeoutJobSchema', () => {
  it('accepts a payload of the Run ID only', () => {
    expect(clarifyingQuestionTimeoutJobSchema.parse({ runId })).toEqual({ runId });
  });

  it('rejects a Run ID that is not a UUID', () => {
    expect(clarifyingQuestionTimeoutJobSchema.safeParse({ runId: 'abc' }).success).toBe(false);
  });
});

describe('clarifyingQuestionTimeoutJobId', () => {
  it('is deterministic per Run and has no colon, which BullMQ rejects in ids', () => {
    expect(clarifyingQuestionTimeoutJobId(runId)).toBe(clarifyingQuestionTimeoutJobId(runId));
    expect(clarifyingQuestionTimeoutJobId(runId)).not.toContain(':');
  });
});
