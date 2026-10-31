import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { fetchPage } from '@worker/web/fetchPage';
import type { FetchPageDeps } from '@worker/web/fetchPage';
import { cutToBudget } from '@worker/web/pageText';
import { WebToolError, withDeadline } from '@worker/web/webToolError';

export type WebFetchDeps = FetchPageDeps & {
  timeoutMs: number;
  /** The most text returned; the rest is cut off. */
  maxChars: number;
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
        fetchPage(start, deps, signal),
      );
      return `Source: ${page.url.href}\n\n${cutToBudget(page.text, deps.maxChars)}`;
    },
    {
      name: 'web_fetch',
      description:
        'Fetches a public web page and returns its readable text, cut to a length budget. Takes an http or https URL.',
      schema: z.object({ url: z.string().min(1).describe('The http or https URL to read') }),
    },
  );
