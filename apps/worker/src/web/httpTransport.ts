import { lookup as dnsLookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { LookupFunction } from 'node:net';

export type ResolvedAddress = { address: string; family: 4 | 6 };

export type HttpResponse = {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: AsyncIterable<Uint8Array>;
  /** Drops a response whose body will not be read, freeing its socket. */
  discard: () => void;
};

export type DnsLookup = (hostname: string) => Promise<ResolvedAddress[]>;

/** One GET of `url`, connected to `address` and never to a fresh lookup of its hostname. */
export type HttpRequest = (
  url: URL,
  address: ResolvedAddress,
  signal: AbortSignal,
) => Promise<HttpResponse>;

export const header = (response: HttpResponse, name: string): string | undefined => {
  const value = response.headers[name];
  return Array.isArray(value) ? value[0] : value;
};

export const dnsResolve: DnsLookup = async (hostname) =>
  (await dnsLookup(hostname, { all: true, verbatim: true })).map(({ address, family }) => ({
    address,
    family: family === 6 ? 6 : 4,
  }));

// Pins the connection to the checked address; TLS still verifies the certificate against the URL's hostname.
export const nodeRequest: HttpRequest = (url, { address, family }, signal) =>
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
