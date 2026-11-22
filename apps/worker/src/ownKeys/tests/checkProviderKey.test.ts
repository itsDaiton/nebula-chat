import { describe, expect, it } from 'vitest';
import { checkProviderKey } from '@worker/ownKeys/checkProviderKey';

const answering = (status: number) => {
  const requests: { url: string; headers: HeadersInit | undefined }[] = [];
  const fetchFn = (async (url: string, init?: RequestInit) => {
    requests.push({ url, headers: init?.headers });
    return new Response('{}', { status });
  }) as typeof fetch;
  return { check: checkProviderKey(fetchFn, 1_000), requests };
};

describe('checkProviderKey', () => {
  it('asks the OpenAI model list with the key as a bearer token', async () => {
    const { check, requests } = answering(200);

    expect(await check('openai', 'sk-x')).toBe('valid');
    expect(requests).toEqual([
      { url: 'https://api.openai.com/v1/models', headers: { Authorization: 'Bearer sk-x' } },
    ]);
  });

  it('asks the Anthropic model list with the key in x-api-key', async () => {
    const { check, requests } = answering(200);

    expect(await check('anthropic', 'sk-ant-x')).toBe('valid');
    expect(requests[0]).toEqual({
      url: 'https://api.anthropic.com/v1/models',
      headers: { 'x-api-key': 'sk-ant-x', 'anthropic-version': '2023-06-01' },
    });
  });

  it.each([401, 403])('calls a key the provider answers %i to invalid', async (status) => {
    expect(await answering(status).check('openai', 'sk-x')).toBe('invalid');
  });

  it.each([429, 500, 503])('cannot tell on a %i, so it throws for a retry', async (status) => {
    await expect(answering(status).check('openai', 'sk-x')).rejects.toThrow(String(status));
  });
});
