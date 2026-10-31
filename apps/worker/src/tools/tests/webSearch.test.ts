import { describe, expect, it } from 'vitest';
import { webSearchTool } from '@worker/tools/webSearch';
import { WebToolError } from '@worker/web/webToolError';

type Sent = { url: string; init: RequestInit };

const provider = (respond: () => Response | Promise<Response>) => {
  const sent: Sent[] = [];
  const fetch = async (url: string | URL | Request, init?: RequestInit) => {
    sent.push({ url: String(url), init: init ?? {} });
    return respond();
  };
  return { fetch: fetch as typeof globalThis.fetch, sent };
};

const TAVILY_RESULTS = {
  query: 'czech koruna rate',
  results: [
    {
      title: 'CZK exchange rate',
      url: 'https://example.com/czk',
      content: 'The koruna traded at 24.3 per euro.',
      score: 0.91,
    },
    {
      title: 'Czech National Bank',
      url: 'https://cnb.example/rates',
      content: 'Official daily rates.',
      score: 0.8,
    },
  ],
  response_time: 0.4,
};

const searching = (
  fake: ReturnType<typeof provider>,
  { apiKey = 'tvly-key' as string | undefined, keyless = false } = {},
) => webSearchTool({ apiKey, keyless, fetch: fake.fetch, timeoutMs: 1_000, maxResults: 5 });

describe('web_search', () => {
  it('maps the provider’s results to a compact list of title, URL and snippet', async () => {
    const fake = provider(() => Response.json(TAVILY_RESULTS));

    const result = await searching(fake).invoke({ query: 'czech koruna rate' });

    expect(JSON.parse(result)).toEqual([
      {
        title: 'CZK exchange rate',
        url: 'https://example.com/czk',
        snippet: 'The koruna traded at 24.3 per euro.',
      },
      {
        title: 'Czech National Bank',
        url: 'https://cnb.example/rates',
        snippet: 'Official daily rates.',
      },
    ]);
  });

  it('sends the query to Tavily with its key as a bearer token', async () => {
    const fake = provider(() => Response.json(TAVILY_RESULTS));

    await searching(fake).invoke({ query: 'czech koruna rate' });

    expect(fake.sent).toHaveLength(1);
    expect(fake.sent[0]?.url).toBe('https://api.tavily.com/search');
    expect(new Headers(fake.sent[0]?.init.headers).get('authorization')).toBe('Bearer tvly-key');
    expect(JSON.parse(String(fake.sent[0]?.init.body))).toMatchObject({
      query: 'czech koruna rate',
      max_results: 5,
    });
  });

  it('fails with a typed provider error when the provider answers with an error status', async () => {
    const fake = provider(() => new Response('rate limited', { status: 429 }));

    const failure = searching(fake).invoke({ query: 'anything' });

    await expect(failure).rejects.toBeInstanceOf(WebToolError);
    await expect(failure).rejects.toMatchObject({ code: 'provider-error' });
  });

  it('fails with a typed provider error when the provider is unreachable', async () => {
    const fake = provider(() => Promise.reject(new TypeError('fetch failed')));

    await expect(searching(fake).invoke({ query: 'anything' })).rejects.toMatchObject({
      code: 'provider-error',
    });
  });

  it('fails with a typed provider error when the provider answers in an unexpected shape', async () => {
    const fake = provider(() => Response.json({ unexpected: true }));

    await expect(searching(fake).invoke({ query: 'anything' })).rejects.toMatchObject({
      code: 'provider-error',
    });
  });

  it('fails with a typed timeout when the provider is too slow', async () => {
    const slow = webSearchTool({
      apiKey: 'k',
      keyless: false,
      fetch: hanging(),
      timeoutMs: 20,
      maxResults: 5,
    });

    await expect(slow.invoke({ query: 'anything' })).rejects.toMatchObject({ code: 'timeout' });
  });

  it('searches keyless without a provider key where keyless is allowed, sending no key', async () => {
    const fake = provider(() => Response.json(TAVILY_RESULTS));

    const result = await searching(fake, { apiKey: '', keyless: true }).invoke({
      query: 'czech koruna rate',
    });

    const headers = new Headers(fake.sent[0]?.init.headers);
    expect(headers.get('x-tavily-access-mode')).toBe('keyless');
    expect(headers.has('authorization')).toBe(false);
    expect(JSON.parse(result)).toHaveLength(2);
  });

  it('sends its key, not keyless, when it has one', async () => {
    const fake = provider(() => Response.json(TAVILY_RESULTS));

    await searching(fake, { keyless: true }).invoke({ query: 'anything' });

    const headers = new Headers(fake.sent[0]?.init.headers);
    expect(headers.get('authorization')).toBe('Bearer tvly-key');
    expect(headers.has('x-tavily-access-mode')).toBe(false);
  });

  it('fails as not configured without a key where keyless is not allowed, sending nothing', async () => {
    const fake = provider(() => Response.json(TAVILY_RESULTS));

    await expect(
      searching(fake, { apiKey: '' }).invoke({ query: 'anything' }),
    ).rejects.toMatchObject({
      code: 'not-configured',
    });
    expect(fake.sent).toEqual([]);
  });
});

// A fetch that only ends when its signal aborts, as a real one does.
const hanging = (): typeof globalThis.fetch =>
  ((_url: string, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
    })) as typeof globalThis.fetch;
