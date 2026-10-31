import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { WebToolError, withDeadline } from '@worker/tools/webToolError';

export type WebSearchDeps = {
  /** Tavily's key; without it the tool answers every call as not configured. */
  apiKey: string | undefined;
  fetch: typeof globalThis.fetch;
  timeoutMs: number;
  maxResults: number;
};

const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';

const tavilyResponseSchema = z.object({
  results: z.array(z.object({ title: z.string(), url: z.string(), content: z.string() })),
});

type WebSearchResult = { title: string; url: string; snippet: string };

const search = async (query: string, deps: WebSearchDeps, signal: AbortSignal) => {
  let response: Response;
  try {
    response = await deps.fetch(TAVILY_SEARCH_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${deps.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ query, max_results: deps.maxResults, search_depth: 'basic' }),
      signal,
    });
  } catch (err) {
    if (signal.aborted) throw err;
    throw new WebToolError('provider-error', 'The search provider could not be reached.');
  }
  if (!response.ok) {
    throw new WebToolError('provider-error', `The search provider answered ${response.status}.`);
  }
  const parsed = tavilyResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new WebToolError('provider-error', 'The search provider answered in an unknown shape.');
  }
  return parsed.data.results.map(({ title, url, content }): WebSearchResult => ({
    title,
    url,
    snippet: content,
  }));
};

export const webSearchTool = (deps: WebSearchDeps) =>
  tool(
    async ({ query }, config): Promise<string> => {
      if (!deps.apiKey) {
        throw new WebToolError('not-configured', 'Web search is not configured on this server.');
      }
      const results = await withDeadline(deps.timeoutMs, config.signal, (signal) =>
        search(query, deps, signal),
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
