import { checkedAddress } from '@worker/web/addressGuard';
import { header } from '@worker/web/httpTransport';
import type { DnsLookup, HttpRequest } from '@worker/web/httpTransport';
import { readPageText } from '@worker/web/pageText';
import { WebToolError } from '@worker/web/webToolError';

export type FetchPageDeps = {
  lookup: DnsLookup;
  request: HttpRequest;
  maxBytes: number;
  maxRedirects: number;
};

const REDIRECTS = new Set([301, 302, 303, 307, 308]);

/** A public page's text and the URL it ended at; every redirect hop is checked like the first. */
export const fetchPage = async (
  start: URL,
  deps: FetchPageDeps,
  signal: AbortSignal,
): Promise<{ url: URL; text: string }> => {
  let url = start;
  for (let redirects = 0; ; redirects += 1) {
    const response = await deps.request(url, await checkedAddress(url, deps.lookup), signal);
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
    return { url, text: await readPageText(response, deps.maxBytes) };
  }
};
