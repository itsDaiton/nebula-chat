import { lookup as dnsLookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { LookupFunction } from 'node:net';
import { BlockList, isIP } from 'node:net';
import { tool } from '@langchain/core/tools';
import { convert } from 'html-to-text';
import { z } from 'zod';
import { WebToolError, withDeadline } from '@worker/tools/webToolError';

export type ResolvedAddress = { address: string; family: 4 | 6 };

export type HttpResponse = {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: AsyncIterable<Uint8Array>;
  /** Drops a response whose body will not be read, freeing its socket. */
  discard: () => void;
};

export type WebFetchDeps = {
  lookup: (hostname: string) => Promise<ResolvedAddress[]>;
  /** One GET of `url`, connected to `address` and never to a fresh lookup of its hostname. */
  request: (url: URL, address: ResolvedAddress, signal: AbortSignal) => Promise<HttpResponse>;
  maxBytes: number;
  timeoutMs: number;
  maxRedirects: number;
  /** The most text returned; the rest is cut off. */
  maxChars: number;
};

// Everything that is not the public internet. BlockList checks an IPv4-mapped IPv6 address against
// the IPv4 rules, so `::ffff:0:0/96` must not be listed: it would match every IPv4 address.
const BLOCKED = new BlockList();
for (const [prefix, bits] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 3],
] as const) {
  BLOCKED.addSubnet(prefix, bits, 'ipv4');
}
for (const [prefix, bits] of [
  ['::', 96],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['2002::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  BLOCKED.addSubnet(prefix, bits, 'ipv6');
}

const isBlocked = (address: string): boolean => {
  const family = isIP(address);
  return family === 0 || BLOCKED.check(address, family === 4 ? 'ipv4' : 'ipv6');
};

const blocked = (url: string): WebToolError =>
  new WebToolError('blocked-url', `Refused: ${url} is not a public HTTP(S) address.`);

// Every address the hostname resolves to must be public; the request then goes to the first of them.
const checkedAddress = async (url: URL, deps: WebFetchDeps): Promise<ResolvedAddress> => {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw blocked(url.href);
  // Only web ports, so a URL cannot speak HTTP at a mail or database server.
  if (url.port !== '' && url.port !== '80' && url.port !== '443') throw blocked(url.href);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const literal = isIP(host);
  let addresses: ResolvedAddress[];
  if (literal) {
    addresses = [{ address: host, family: literal as 4 | 6 }];
  } else {
    addresses = await deps.lookup(host).catch(() => {
      throw new WebToolError('invalid-url', `Could not resolve ${host}.`);
    });
  }
  if (addresses.length === 0 || addresses.some((a) => isBlocked(a.address))) {
    throw blocked(url.href);
  }
  return addresses[0]!;
};

const header = (response: HttpResponse, name: string): string | undefined => {
  const value = response.headers[name];
  return Array.isArray(value) ? value[0] : value;
};

const REDIRECTS = new Set([301, 302, 303, 307, 308]);

// The cap is checked as each chunk arrives, so an oversized body is never held whole.
const readCapped = async (response: HttpResponse, maxBytes: number): Promise<Uint8Array[]> => {
  const declared = Number(header(response, 'content-length'));
  const tooLarge = new WebToolError('too-large', `The page is larger than ${maxBytes} bytes.`);
  if (declared > maxBytes) {
    response.discard();
    throw tooLarge;
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of response.body) {
    total += chunk.byteLength;
    if (total > maxBytes) {
      response.discard();
      throw tooLarge;
    }
    chunks.push(chunk);
  }
  return chunks;
};

const decode = (chunks: Uint8Array[], contentType: string): string => {
  const charset = /charset=([^;]+)/i.exec(contentType)?.[1]?.trim() ?? 'utf-8';
  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(charset);
  } catch {
    decoder = new TextDecoder();
  }
  return decoder.decode(Buffer.concat(chunks));
};

const toText = (body: string, contentType: string): string => {
  if (!/html/i.test(contentType)) return body;
  return convert(body, {
    wordwrap: false,
    selectors: [
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'img', format: 'skip' },
      { selector: 'script', format: 'skip' },
      { selector: 'style', format: 'skip' },
      { selector: 'noscript', format: 'skip' },
    ],
  });
};

const fetchText = async (start: URL, deps: WebFetchDeps, signal: AbortSignal) => {
  let url = start;
  for (let redirects = 0; ; redirects += 1) {
    const response = await deps.request(url, await checkedAddress(url, deps), signal);
    const location = header(response, 'location');
    if (REDIRECTS.has(response.status) && location) {
      response.discard();
      if (redirects >= deps.maxRedirects) {
        throw new WebToolError('too-many-redirects', `More than ${deps.maxRedirects} redirects.`);
      }
      url = new URL(location, url);
      continue;
    }
    if (response.status >= 400) {
      response.discard();
      throw new WebToolError('http-error', `The page answered ${response.status}.`);
    }
    const encoding = header(response, 'content-encoding') ?? 'identity';
    if (encoding !== 'identity') {
      response.discard();
      throw new WebToolError('unsupported-content', `Cannot read a ${encoding}-encoded page.`);
    }
    const contentType = header(response, 'content-type') ?? 'text/plain';
    if (!/^text\/|html|xml/i.test(contentType)) {
      response.discard();
      throw new WebToolError('unsupported-content', `Cannot read ${contentType} as text.`);
    }
    const text = toText(
      decode(await readCapped(response, deps.maxBytes), contentType),
      contentType,
    );
    return { url, text: text.trim() };
  }
};

export const webFetchTool = (deps: WebFetchDeps) =>
  tool(
    async ({ url }, config): Promise<string> => {
      let start: URL;
      try {
        start = new URL(url);
      } catch {
        throw new WebToolError('invalid-url', `${url} is not a URL.`);
      }
      const page = await withDeadline(deps.timeoutMs, config.signal, (signal) =>
        fetchText(start, deps, signal),
      );
      const text =
        page.text.length > deps.maxChars
          ? `${page.text.slice(0, deps.maxChars)}\n\n[Truncated: the page is longer than ${deps.maxChars} characters.]`
          : page.text;
      return `Source: ${page.url.href}\n\n${text}`;
    },
    {
      name: 'web_fetch',
      description:
        'Fetches a public web page and returns its readable text, cut to a length budget. Takes an http or https URL.',
      schema: z.object({ url: z.string().min(1).describe('The http or https URL to read') }),
    },
  );

export const dnsResolve = async (hostname: string): Promise<ResolvedAddress[]> =>
  (await dnsLookup(hostname, { all: true, verbatim: true })).map(({ address, family }) => ({
    address,
    family: family === 6 ? 6 : 4,
  }));

// Pins the connection to the checked address; TLS still verifies the certificate against the URL's hostname.
export const nodeRequest: WebFetchDeps['request'] = (url, { address, family }, signal) =>
  new Promise((resolve, reject) => {
    const lookup: LookupFunction = (_hostname, options, callback) => {
      if (options.all) callback(null, [{ address, family }]);
      else callback(null, address, family);
    };
    const send = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const req = send(
      url,
      {
        method: 'GET',
        lookup,
        signal,
        headers: {
          'user-agent': 'NebulaChat/2.0 (web_fetch)',
          accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1',
          'accept-encoding': 'identity',
        },
      },
      (res) => {
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          body: res,
          discard: () => res.destroy(),
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
