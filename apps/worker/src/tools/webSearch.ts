import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { searchTavily } from '@worker/web/tavily';
import { WebToolError, withDeadline } from '@worker/web/webToolError';

export type WebSearchDeps = {
  /** Tavily's key; without it the tool searches keyless where allowed, else answers as not configured. */
  apiKey: string | undefined;
  /** Whether a missing key may fall back to Tavily's rate-limited keyless access. */
  keyless: boolean;
  fetch: typeof globalThis.fetch;
  timeoutMs: number;
  maxResults: number;
};

export const webSearchTool = ({ apiKey, keyless, timeoutMs, ...deps }: WebSearchDeps) =>
  tool(
    async ({ query }, config): Promise<string> => {
      if (!apiKey && !keyless) {
        throw new WebToolError('not-configured', 'Web search is not configured on this server.');
      }
      const results = await withDeadline(timeoutMs, config.signal, (signal) =>
        searchTavily(query, { ...deps, apiKey }, signal),
      );
      return JSON.stringify(results);
    },
    {
      name: 'web_search',
      description:
        'Searches the web. Returns a JSON list of results, each with a title, URL and snippet. Read a promising result in full with web_fetch.',
      schema: z.object({ query: z.string().min(1).describe('What to search for, as keywords') }),
    },
  );
