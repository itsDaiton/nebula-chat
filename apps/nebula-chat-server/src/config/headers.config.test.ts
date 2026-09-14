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
  it('declares an SSE content type', () => {
    const { res, headers } = createResponse();

    applyHeaders(res, 'https://app.example.com');

    expect(headers.get('Content-Type')).toBe('text/event-stream');
  });

  it('disables caching and keeps the connection open', () => {
    const { res, headers } = createResponse();

    applyHeaders(res, 'https://app.example.com');

    expect(headers.get('Cache-Control')).toBe('no-cache');
    expect(headers.get('Connection')).toBe('keep-alive');
  });

  it('echoes the request origin back', () => {
    const { res, headers } = createResponse();

    applyHeaders(res, 'https://app.example.com');

    expect(headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
  });

  it('falls back to a wildcard origin when none is supplied', () => {
    const { res, headers } = createResponse();

    applyHeaders(res, undefined);

    expect(headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('falls back to a wildcard for an empty origin', () => {
    const { res, headers } = createResponse();

    applyHeaders(res, '');

    expect(headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('allows credentials', () => {
    const { res, headers } = createResponse();

    applyHeaders(res, 'https://app.example.com');

    expect(headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });
});
