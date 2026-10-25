import { describe, expect, it } from 'vitest';
import { directReplyJobSchema } from '../directReplyJob';

const job = {
  userId: '11111111-1111-4111-8111-111111111111',
  sessionId: '22222222-2222-4222-8222-222222222222',
  messageId: '33333333-3333-4333-8333-333333333333',
  streamId: '44444444-4444-4444-8444-444444444444',
};

describe('directReplyJobSchema', () => {
  it('accepts a payload of IDs', () => {
    expect(directReplyJobSchema.parse(job)).toEqual(job);
  });

  it('rejects a payload with an ID missing', () => {
    expect(directReplyJobSchema.safeParse({ ...job, streamId: undefined }).success).toBe(false);
  });

  it('rejects an ID that is not a UUID', () => {
    expect(directReplyJobSchema.safeParse({ ...job, sessionId: 'abc' }).success).toBe(false);
  });

  it('accepts the W3C trace context alongside the IDs', () => {
    const traceContext = {
      traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
      tracestate: 'vendor=1',
    };
    expect(directReplyJobSchema.parse({ ...job, ...traceContext })).toEqual({
      ...job,
      ...traceContext,
    });
  });

  it('drops anything beyond the IDs, so content never rides along', () => {
    expect(directReplyJobSchema.parse({ ...job, content: 'hello' })).toEqual(job);
  });
});
