import { describe, expect, it } from 'vitest';
import { webFetchTool } from '@worker/tools/webFetch';

type Sent = { url: string; init: RequestInit };

const EXTRACTED = {
  results: [{ url: 'https://example.com/czk', raw_content: 'The koruna traded at 24.3 per euro.' }],
  failed_results: [],
};

const provider = (respond: () => Response | Promise<Response> = () => Response.json(EXTRACTED)) => {
  const sent: Sent[] = [];
  const fetch = async (url: string | URL | Request, init?: RequestInit) => {
    sent.push({ url: String(url), init: init ?? {} });
    return respond();
  };
  return { fetch: fetch as typeof globalThis.fetch, sent };
};

const fetching = (
  fake: ReturnType<typeof provider>,
  {
    apiKey = 'tvly-key' as string | undefined,
    keyless = false,
    maxChars = 10_000,
    timeoutMs = 1_000,
  } = {},
) => webFetchTool({ apiKey, keyless, fetch: fake.fetch, timeoutMs, maxChars });

// A fetch that only ends when its signal aborts, as a real one does.
const hanging = (): typeof globalThis.fetch =>
  ((_url: string, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
    })) as typeof globalThis.fetch;

describe('web_fetch', () => {
  it('returns the extracted page text, prefixed with its source URL', async () => {
    const fake = provider();

    const text = await fetching(fake).invoke({ url: 'https://example.com/czk' });

    expect(text).toBe('Source: https://example.com/czk\n\nThe koruna traded at 24.3 per euro.');
  });

  it('asks Tavily Extract for the URL with its key, and never connects to the URL itself', async () => {
    const fake = provider();

    await fetching(fake).invoke({ url: 'https://example.com/czk' });

    expect(fake.sent.map((call) => call.url)).toEqual(['https://api.tavily.com/extract']);
    expect(new Headers(fake.sent[0]?.init.headers).get('authorization')).toBe('Bearer tvly-key');
    expect(JSON.parse(String(fake.sent[0]?.init.body))).toMatchObject({
      urls: ['https://example.com/czk'],
    });
  });

  it('truncates the text to its budget, saying so', async () => {
    const fake = provider(() =>
      Response.json({
        results: [{ url: 'https://example.com/long', raw_content: 'a'.repeat(500) }],
        failed_results: [],
      }),
    );

    const text = await fetching(fake, { maxChars: 100 }).invoke({
      url: 'https://example.com/long',
    });

    expect(text).toContain(`${'a'.repeat(100)}\n\n[Truncated`);
    expect(text).not.toContain('a'.repeat(101));
  });

  it('sends its key, not keyless, when it has one', async () => {
    const fake = provider();

    await fetching(fake, { keyless: true }).invoke({ url: 'https://example.com/czk' });

    const headers = new Headers(fake.sent[0]?.init.headers);
    expect(headers.get('authorization')).toBe('Bearer tvly-key');
    expect(headers.has('x-tavily-access-mode')).toBe(false);
  });

  it('extracts keyless without a key where keyless is allowed, sending no key', async () => {
    const fake = provider();

    await fetching(fake, { apiKey: '', keyless: true }).invoke({ url: 'https://example.com/czk' });

    const headers = new Headers(fake.sent[0]?.init.headers);
    expect(headers.get('x-tavily-access-mode')).toBe('keyless');
    expect(headers.has('authorization')).toBe(false);
  });

  it('fails as not configured without a key where keyless is not allowed, sending nothing', async () => {
    const fake = provider();

    await expect(
      fetching(fake, { apiKey: '' }).invoke({ url: 'https://example.com/czk' }),
    ).rejects.toMatchObject({ code: 'not-configured' });
    expect(fake.sent).toEqual([]);
  });

  describe('refuses', () => {
    it.each(['file:///etc/passwd', 'ftp://example.com/', 'gopher://example.com/', 'data:,hi'])(
      'the non-HTTP(S) URL %s, sending nothing',
      async (url) => {
        const fake = provider();

        await expect(fetching(fake).invoke({ url })).rejects.toMatchObject({ code: 'blocked-url' });
        expect(fake.sent).toEqual([]);
      },
    );

    it('a string that is not a URL, sending nothing', async () => {
      const fake = provider();

      await expect(fetching(fake).invoke({ url: 'not a url' })).rejects.toMatchObject({
        code: 'invalid-url',
      });
      expect(fake.sent).toEqual([]);
    });

    it('a page Tavily lists as failed, as a typed error', async () => {
      const fake = provider(() =>
        Response.json({
          results: [],
          failed_results: [{ url: 'https://example.com/gone' }],
        }),
      );

      await expect(
        fetching(fake).invoke({ url: 'https://example.com/gone' }),
      ).rejects.toMatchObject({ code: 'unsupported-content' });
    });

    it('a page Tavily returns empty, as a typed error', async () => {
      const fake = provider(() =>
        Response.json({
          results: [{ url: 'https://example.com/blank', raw_content: '   ' }],
          failed_results: [],
        }),
      );

      await expect(
        fetching(fake).invoke({ url: 'https://example.com/blank' }),
      ).rejects.toMatchObject({ code: 'unsupported-content' });
    });

    it('a provider answering with an error status, as a typed provider error', async () => {
      const fake = provider(() => new Response('rate limited', { status: 429 }));

      await expect(fetching(fake).invoke({ url: 'https://example.com/czk' })).rejects.toMatchObject(
        { code: 'provider-error' },
      );
    });

    it('an unreachable provider, as a typed provider error', async () => {
      const fake = provider(() => Promise.reject(new TypeError('fetch failed')));

      await expect(fetching(fake).invoke({ url: 'https://example.com/czk' })).rejects.toMatchObject(
        { code: 'provider-error' },
      );
    });

    it('a provider answering in an unexpected shape, as a typed provider error', async () => {
      const fake = provider(() => Response.json({ unexpected: true }));

      await expect(fetching(fake).invoke({ url: 'https://example.com/czk' })).rejects.toMatchObject(
        { code: 'provider-error' },
      );
    });

    it('a provider that takes longer than the deadline, as a typed timeout', async () => {
      const slow = webFetchTool({
        apiKey: 'k',
        keyless: false,
        fetch: hanging(),
        timeoutMs: 20,
        maxChars: 10_000,
      });

      await expect(slow.invoke({ url: 'https://example.com/slow' })).rejects.toMatchObject({
        code: 'timeout',
      });
    });

    it('a stopped Run aborts the call, not as a provider error', async () => {
      const slow = webFetchTool({
        apiKey: 'k',
        keyless: false,
        fetch: hanging(),
        timeoutMs: 10_000,
        maxChars: 10_000,
      });
      const run = new AbortController();
      const failure = slow
        .invoke({ url: 'https://example.com/slow' }, { signal: run.signal })
        .catch((err: unknown) => err);
      await new Promise((resolve) => setTimeout(resolve, 10));
      run.abort();

      const error = await failure;
      expect(error).not.toMatchObject({ code: 'provider-error' });
      expect(error).not.toMatchObject({ code: 'timeout' });
    });
  });
});
