import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import type { FastifyReply } from 'fastify';
import { describe, expect, it } from 'vitest';
import { setSseHeaders } from '@backend/config/headers.config';

// A real raw response behind a reply that holds `pending` as its buffered headers.
const createReply = (pending: Record<string, string> = {}) => {
  const raw = new ServerResponse(new IncomingMessage(new Socket()));
  const reply = { raw, getHeaders: () => pending } as unknown as FastifyReply;
  return { reply, raw };
};

describe('setSseHeaders', () => {
  it.each([
    ['content-type', 'text/event-stream'],
    ['cache-control', 'no-cache'],
    ['connection', 'keep-alive'],
  ])('sets %s to %s', (header, value) => {
    const { reply, raw } = createReply();

    setSseHeaders(reply);

    expect(raw.getHeader(header)).toBe(value);
  });

  it("forwards the reply's buffered headers onto the raw response", () => {
    const pending = {
      'access-control-allow-origin': 'https://app.example.com',
      'access-control-allow-credentials': 'true',
      vary: 'Origin',
      'x-ratelimit-remaining': '9',
    };
    const { reply, raw } = createReply(pending);

    setSseHeaders(reply);

    expect(raw.getHeaders()).toMatchObject(pending);
  });

  it('adds no access-control-* header of its own', () => {
    const { reply, raw } = createReply();

    setSseHeaders(reply);

    expect(raw.getHeaderNames().filter((name) => name.startsWith('access-control-'))).toEqual([]);
  });

  it('keeps the SSE content-type over one already buffered on the reply', () => {
    const { reply, raw } = createReply({ 'content-type': 'application/json' });

    setSseHeaders(reply);

    expect(raw.getHeader('content-type')).toBe('text/event-stream');
  });
});
