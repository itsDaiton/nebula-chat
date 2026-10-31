import { describe, expect, it } from 'vitest';
import { webFetchTool } from '@worker/tools/webFetch';
import type { WebFetchDeps } from '@worker/tools/webFetch';
import type { HttpResponse, ResolvedAddress } from '@worker/web/httpTransport';

const PUBLIC_V4: ResolvedAddress = { address: '93.184.215.14', family: 4 };

type Page = {
  status?: number;
  headers?: Record<string, string>;
  body?: string | Uint8Array[];
  /** Holds the response back until the request is aborted. */
  hang?: boolean;
};

// Faked DNS and HTTP: each hostname resolves as listed, each URL answers its page.
const web = (dns: Record<string, ResolvedAddress[]>, pages: Record<string, Page>) => {
  const requests: { url: string; address: string }[] = [];
  const deps: Pick<WebFetchDeps, 'lookup' | 'request'> = {
    lookup: async (hostname) => {
      const found = dns[hostname];
      if (!found) throw Object.assign(new Error(`ENOTFOUND ${hostname}`), { code: 'ENOTFOUND' });
      return found;
    },
    request: async (url, address, signal): Promise<HttpResponse> => {
      requests.push({ url: url.href, address: address.address });
      const page = pages[url.href];
      if (!page) throw new Error(`No page at ${url.href}`);
      if (page.hang) {
        await new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason));
        });
      }
      const chunks =
        typeof page.body === 'string' ? [new TextEncoder().encode(page.body)] : (page.body ?? []);
      return {
        status: page.status ?? 200,
        headers: { 'content-type': 'text/html; charset=utf-8', ...page.headers },
        body: (async function* () {
          yield* chunks;
        })(),
        discard: () => undefined,
      };
    },
  };
  return { deps, requests };
};

const fetching = (
  fake: ReturnType<typeof web>,
  limits: Partial<Pick<WebFetchDeps, 'maxBytes' | 'timeoutMs' | 'maxRedirects' | 'maxChars'>> = {},
) =>
  webFetchTool({
    ...fake.deps,
    maxBytes: 100_000,
    timeoutMs: 1_000,
    maxRedirects: 3,
    maxChars: 10_000,
    ...limits,
  });

const ARTICLE = `<!doctype html><html><head><title>Koruna</title>
<style>body { color: red }</style><script>window.track = "secret";</script></head>
<body><h1>The koruna</h1><p>It traded at <b>24.3</b> per euro.</p></body></html>`;

describe('web_fetch', () => {
  it('returns a public page as readable text, without its scripts and styles', async () => {
    const fake = web(
      { 'example.com': [PUBLIC_V4] },
      { 'https://example.com/czk': { body: ARTICLE } },
    );

    const text = await fetching(fake).invoke({ url: 'https://example.com/czk' });

    expect(text).toContain('https://example.com/czk');
    expect(text).toContain('THE KORUNA');
    expect(text).toContain('It traded at 24.3 per euro.');
    expect(text).not.toContain('secret');
    expect(text).not.toContain('color: red');
  });

  it('connects to the address it checked, not to a second lookup', async () => {
    const fake = web({ 'example.com': [PUBLIC_V4] }, { 'https://example.com/': { body: ARTICLE } });

    await fetching(fake).invoke({ url: 'https://example.com/' });

    expect(fake.requests).toEqual([{ url: 'https://example.com/', address: '93.184.215.14' }]);
  });

  it('reaches a hostname with only public IPv4 and IPv6 addresses', async () => {
    const fake = web(
      {
        'dual.example': [
          { address: '2606:4700:4700::1111', family: 6 },
          { address: '8.8.8.8', family: 4 },
        ],
      },
      { 'https://dual.example/': { body: ARTICLE } },
    );

    await fetching(fake).invoke({ url: 'https://dual.example/' });

    expect(fake.requests).toEqual([
      { url: 'https://dual.example/', address: '2606:4700:4700::1111' },
    ]);
  });

  it('returns a plain-text page as it is', async () => {
    const fake = web(
      { 'example.com': [PUBLIC_V4] },
      {
        'https://example.com/notes.txt': {
          headers: { 'content-type': 'text/plain' },
          body: 'line one\nline two',
        },
      },
    );

    expect(await fetching(fake).invoke({ url: 'https://example.com/notes.txt' })).toContain(
      'line one\nline two',
    );
  });

  it('truncates the text to its budget, saying so', async () => {
    const fake = web(
      { 'example.com': [PUBLIC_V4] },
      {
        'https://example.com/long': {
          headers: { 'content-type': 'text/plain' },
          body: 'a'.repeat(500),
        },
      },
    );

    const text = await fetching(fake, { maxChars: 100 }).invoke({
      url: 'https://example.com/long',
    });

    expect(text).toContain(`${'a'.repeat(100)}\n\n[Truncated`);
    expect(text).not.toContain('a'.repeat(101));
  });

  describe('refuses', () => {
    const blocked = async (url: string, dns: Record<string, ResolvedAddress[]> = {}) => {
      const fake = web(dns, {});
      await expect(fetching(fake).invoke({ url })).rejects.toMatchObject({ code: 'blocked-url' });
      expect(fake.requests).toEqual([]);
    };

    it.each([
      ['loopback', 'http://127.0.0.1/'],
      ['loopback, written as a number', 'http://2130706433/'],
      ['IPv6 loopback', 'http://[::1]/'],
      ['RFC 1918 10/8', 'http://10.0.0.5/'],
      ['RFC 1918 172.16/12', 'http://172.20.1.1/'],
      ['RFC 1918 192.168/16', 'http://192.168.1.1/'],
      ['link-local', 'http://169.254.10.10/'],
      ['the cloud metadata address', 'http://169.254.169.254/latest/meta-data/'],
      ['unique-local IPv6', 'http://[fd00::1]/'],
      ['link-local IPv6', 'http://[fe80::1]/'],
      ['IPv4-mapped IPv6 loopback', 'http://[::ffff:127.0.0.1]/'],
      ['the unspecified address', 'http://0.0.0.0/'],
      ['IPv4-compatible IPv6 loopback', 'http://[::7f00:1]/'],
      ['6to4 over a private address', 'http://[2002:a00:1::]/'],
      ['local-use NAT64', 'http://[64:ff9b:1::a00:1]/'],
      ['a port other than 80 or 443', 'http://example.com:25/'],
    ])('%s', async (_name, url) => {
      await blocked(url, { 'example.com': [PUBLIC_V4] });
    });

    it.each([
      ['loopback', { address: '127.0.0.1', family: 4 }],
      ['private', { address: '10.1.2.3', family: 4 }],
      ['the cloud metadata address', { address: '169.254.169.254', family: 4 }],
      ['unique-local IPv6', { address: 'fc00::7', family: 6 }],
    ] as const)('a hostname that resolves to %s', async (_name, address) => {
      await blocked('https://innocent.example/', { 'innocent.example': [address] });
    });

    it('a hostname with any blocked address among its public ones', async () => {
      await blocked('https://mixed.example/', {
        'mixed.example': [PUBLIC_V4, { address: '127.0.0.1', family: 4 }],
      });
    });

    it.each(['file:///etc/passwd', 'ftp://example.com/', 'gopher://example.com/', 'data:,hi'])(
      'the non-HTTP(S) URL %s',
      async (url) => {
        await blocked(url, { 'example.com': [PUBLIC_V4] });
      },
    );

    it('a redirect to a private address', async () => {
      const fake = web(
        { 'example.com': [PUBLIC_V4] },
        {
          'https://example.com/go': {
            status: 302,
            headers: { location: 'http://169.254.169.254/latest/meta-data/' },
          },
        },
      );

      await expect(fetching(fake).invoke({ url: 'https://example.com/go' })).rejects.toMatchObject({
        code: 'blocked-url',
      });
      expect(fake.requests.map((r) => r.url)).toEqual(['https://example.com/go']);
    });

    it('a redirect to a hostname that resolves to a private address', async () => {
      const fake = web(
        { 'example.com': [PUBLIC_V4], 'rebind.example': [{ address: '192.168.0.1', family: 4 }] },
        {
          'https://example.com/go': {
            status: 301,
            headers: { location: 'https://rebind.example/' },
          },
        },
      );

      await expect(fetching(fake).invoke({ url: 'https://example.com/go' })).rejects.toMatchObject({
        code: 'blocked-url',
      });
      expect(fake.requests).toHaveLength(1);
    });

    it('a redirect to a non-HTTP(S) URL', async () => {
      const fake = web(
        { 'example.com': [PUBLIC_V4] },
        { 'https://example.com/go': { status: 302, headers: { location: 'file:///etc/passwd' } } },
      );

      await expect(fetching(fake).invoke({ url: 'https://example.com/go' })).rejects.toMatchObject({
        code: 'blocked-url',
      });
    });

    it('more redirects than its cap', async () => {
      const hop = (n: number): Page => ({
        status: 302,
        headers: { location: `https://example.com/${n + 1}` },
      });
      const fake = web(
        { 'example.com': [PUBLIC_V4] },
        {
          'https://example.com/1': hop(1),
          'https://example.com/2': hop(2),
          'https://example.com/3': { body: ARTICLE },
        },
      );

      await expect(
        fetching(fake, { maxRedirects: 1 }).invoke({ url: 'https://example.com/1' }),
      ).rejects.toMatchObject({ code: 'too-many-redirects' });
      expect(fake.requests).toHaveLength(2);
    });

    it('a body that declares more than its size cap, reading none of it', async () => {
      const fake = web(
        { 'example.com': [PUBLIC_V4] },
        { 'https://example.com/big': { headers: { 'content-length': '5000' }, body: 'x' } },
      );

      await expect(
        fetching(fake, { maxBytes: 1_000 }).invoke({ url: 'https://example.com/big' }),
      ).rejects.toMatchObject({ code: 'too-large' });
    });

    it('a body that streams past its size cap, stopping as it crosses it', async () => {
      let pulled = 0;
      const chunk = new Uint8Array(400).fill(65);
      const endless = (async function* () {
        for (;;) {
          pulled += 1;
          yield chunk;
        }
      })();
      const fake = web({ 'example.com': [PUBLIC_V4] }, {});
      fake.deps.request = async () => ({
        status: 200,
        headers: { 'content-type': 'text/plain' },
        body: endless,
        discard: () => undefined,
      });

      await expect(
        fetching(fake, { maxBytes: 1_000 }).invoke({ url: 'https://example.com/stream' }),
      ).rejects.toMatchObject({ code: 'too-large' });
      expect(pulled).toBe(3);
    });

    it('a page that takes longer than its timeout', async () => {
      const fake = web(
        { 'example.com': [PUBLIC_V4] },
        { 'https://example.com/slow': { hang: true } },
      );

      await expect(
        fetching(fake, { timeoutMs: 20 }).invoke({ url: 'https://example.com/slow' }),
      ).rejects.toMatchObject({ code: 'timeout' });
    });

    it('a body that is not text', async () => {
      const fake = web(
        { 'example.com': [PUBLIC_V4] },
        { 'https://example.com/a.pdf': { headers: { 'content-type': 'application/pdf' } } },
      );

      await expect(
        fetching(fake).invoke({ url: 'https://example.com/a.pdf' }),
      ).rejects.toMatchObject({ code: 'unsupported-content' });
    });

    it('a compressed body it asked not to get', async () => {
      const fake = web(
        { 'example.com': [PUBLIC_V4] },
        { 'https://example.com/gz': { headers: { 'content-encoding': 'gzip' }, body: 'x' } },
      );

      await expect(fetching(fake).invoke({ url: 'https://example.com/gz' })).rejects.toMatchObject({
        code: 'unsupported-content',
      });
    });

    it('an error status, naming it', async () => {
      const fake = web(
        { 'example.com': [PUBLIC_V4] },
        { 'https://example.com/gone': { status: 404 } },
      );

      await expect(
        fetching(fake).invoke({ url: 'https://example.com/gone' }),
      ).rejects.toMatchObject({
        code: 'http-error',
        message: expect.stringContaining('404'),
      });
    });

    it('a hostname that does not resolve', async () => {
      await expect(
        fetching(web({}, {})).invoke({ url: 'https://nowhere.example/' }),
      ).rejects.toMatchObject({ code: 'invalid-url' });
    });
  });
});
