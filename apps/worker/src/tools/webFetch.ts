import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { extractTavily } from '@worker/web/tavily';
import { WebToolError, withDeadline } from '@worker/web/webToolError';

export type WebFetchDeps = {
  /** Tavily's key; without it the tool extracts keyless where allowed, else answers as not configured. */
  apiKey: string | undefined;
  /** Whether a missing key may fall back to Tavily's rate-limited keyless access. */
  keyless: boolean;
  fetch: typeof globalThis.fetch;
  timeoutMs: number;
  /** The most text returned; the rest is cut off. */
  maxChars: number;
};

const cutToBudget = (text: string, maxChars: number): string =>
  text.length > maxChars
    ? `${text.slice(0, maxChars)}\n\n[Truncated: the page is longer than ${maxChars} characters.]`
    : text;

export const webFetchTool = ({ apiKey, keyless, timeoutMs, maxChars, ...deps }: WebFetchDeps) =>
  tool(
    async ({ url }, config): Promise<string> => {
      let start: URL;
      try {
        start = new URL(url);
      } catch {
        throw new WebToolError('invalid-url', `${url} is not a URL.`);
      }
      if (start.protocol !== 'http:' && start.protocol !== 'https:') {
        throw new WebToolError('blocked-url', `${url} is not an http or https URL.`);
      }
      if (!apiKey && !keyless) {
        throw new WebToolError('not-configured', 'Web fetch is not configured on this server.');
      }
      const text = await withDeadline(timeoutMs, config.signal, (signal) =>
        extractTavily(start.href, { ...deps, apiKey }, signal),
      );
      return `Source: ${start.href}\n\n${cutToBudget(text, maxChars)}`;
    },
    {
      name: 'web_fetch',
      description:
        'Fetches a public web page and returns its readable text, cut to a length budget. Takes an http or https URL.',
      schema: z.object({ url: z.string().min(1).describe('The http or https URL to read') }),
    },
  );
