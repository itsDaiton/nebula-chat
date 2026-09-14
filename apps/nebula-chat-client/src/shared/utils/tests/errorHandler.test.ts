import { describe, expect, it } from 'vitest';
import { HttpError, handleHttpError, handleNetworkError } from '@/shared/utils/errorHandler';

/** A Response whose json() resolves to `body`, or rejects when `body` is undefined. */
const jsonResponse = (status: number, statusText: string, body?: unknown) =>
  ({
    status,
    statusText,
    json: async () => {
      if (body === undefined) throw new SyntaxError('Unexpected end of JSON input');
      return body;
    },
  }) as Response;

describe('HttpError', () => {
  it('carries the status and status text alongside the message', () => {
    const err = new HttpError('Not found', 404, 'Not Found');

    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
    expect(err.statusText).toBe('Not Found');
    expect(err.name).toBe('HttpError');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('handleHttpError', () => {
  it("prefers the server's message field", async () => {
    await expect(
      handleHttpError(jsonResponse(404, 'Not Found', { message: 'Conversation not found' })),
    ).rejects.toThrow('Conversation not found');
  });

  it("falls back to the server's error field", async () => {
    await expect(
      handleHttpError(jsonResponse(400, 'Bad Request', { error: 'ValidationError' })),
    ).rejects.toThrow('ValidationError');
  });

  it('falls back to the status code when the body carries neither', async () => {
    await expect(handleHttpError(jsonResponse(500, 'Server Error', {}))).rejects.toThrow(
      'Request failed with status 500',
    );
  });

  it('handles a body that is not JSON at all', async () => {
    await expect(handleHttpError(jsonResponse(502, 'Bad Gateway'))).rejects.toThrow(
      'Request failed with status 502: Bad Gateway',
    );
  });

  it('always throws an HttpError carrying the status', async () => {
    await expect(
      handleHttpError(jsonResponse(403, 'Forbidden', { message: 'nope' })),
    ).rejects.toMatchObject({ name: 'HttpError', statusCode: 403 });
  });
});

describe('handleNetworkError', () => {
  it('rethrows an HttpError untouched', () => {
    const original = new HttpError('Not found', 404, 'Not Found');

    expect(() => handleNetworkError(original)).toThrow(original);
  });

  it('translates a fetch TypeError into a connectivity message', () => {
    // fetch rejects with TypeError when the request never reached the server.
    expect(() => handleNetworkError(new TypeError('Failed to fetch'))).toThrow(
      /Unable to connect to the server/,
    );
  });

  it('rethrows any other Error unchanged', () => {
    const original = new RangeError('out of range');

    expect(() => handleNetworkError(original)).toThrow(original);
  });

  it('wraps a non-Error rejection in a generic message', () => {
    expect(() => handleNetworkError('a bare string')).toThrow(/unknown error occurred/i);
  });

  it('wraps null', () => {
    expect(() => handleNetworkError(null)).toThrow(/unknown error occurred/i);
  });
});
