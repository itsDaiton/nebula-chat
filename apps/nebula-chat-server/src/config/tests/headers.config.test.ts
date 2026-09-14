import type { ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import { setCacheHeaders, setHeaders } from '@backend/config/headers.config';

const createResponse = () => {
  const headers = new Map<string, string>();
  const res = {
    setHeader: vi.fn((name: string, value: string) => headers.set(name, value)),
  };
  return { res: res as unknown as ServerResponse, headers };
};

describe.each([
  ['setHeaders', setHeaders],
  ['setCacheHeaders', setCacheHeaders],
])('%s', (_name, applyHeaders) => {
  // Both helpers set the same five headers; only their write order differs.
  it.each([
    ['Content-Type', 'text/event-stream'],
    ['Cache-Control', 'no-cache'],
    ['Connection', 'keep-alive'],
    ['Access-Control-Allow-Origin', 'https://app.example.com'],
    ['Access-Control-Allow-Credentials', 'true'],
  ])('sets %s to %s', (header, value) => {
    const { res, headers } = createResponse();

    applyHeaders(res, 'https://app.example.com');

    expect(headers.get(header)).toBe(value);
  });

  it.each([
    ['no origin at all', undefined],
    ['an empty origin', ''],
  ])('falls back to a wildcard origin given %s', (_case, origin) => {
    const { res, headers } = createResponse();

    applyHeaders(res, origin);

    expect(headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
