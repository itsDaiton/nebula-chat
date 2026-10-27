import { describe, expect, it } from 'vitest';
import { runJobSchema } from '../runJob';

const job = {
  userId: '11111111-1111-4111-8111-111111111111',
  sessionId: '22222222-2222-4222-8222-222222222222',
  messageId: '33333333-3333-4333-8333-333333333333',
  streamId: '44444444-4444-4444-8444-444444444444',
  runId: '55555555-5555-4555-8555-555555555555',
};

describe('runJobSchema', () => {
  it('accepts a payload of IDs', () => {
    expect(runJobSchema.parse(job)).toEqual(job);
  });

  it('rejects a payload without its Run', () => {
    expect(runJobSchema.safeParse({ ...job, runId: undefined }).success).toBe(false);
  });

  it('rejects an ID that is not a UUID', () => {
    expect(runJobSchema.safeParse({ ...job, runId: 'abc' }).success).toBe(false);
  });

  it('accepts the W3C trace context alongside the IDs', () => {
    const traceContext = {
      traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
      tracestate: 'vendor=1',
    };
    expect(runJobSchema.parse({ ...job, ...traceContext })).toEqual({ ...job, ...traceContext });
  });

  it('drops anything beyond the IDs, so content never rides along', () => {
    expect(runJobSchema.parse({ ...job, content: 'hello' })).toEqual(job);
  });
});
