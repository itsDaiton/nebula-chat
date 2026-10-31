import { z } from 'zod';
import { WebToolError } from '@worker/web/webToolError';

export type TavilyDeps = {
  /** Without one the request is keyless: Search still answers, rate-limited. */
  apiKey: string | undefined;
  fetch: typeof globalThis.fetch;
  maxResults: number;
};

const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';

const tavilyResponseSchema = z.object({
  results: z.array(z.object({ title: z.string(), url: z.string(), content: z.string() })),
});

type SearchResult = { title: string; url: string; snippet: string };

/** Tavily's results for `query`, mapped to a compact list; any failure of the provider is a `provider-error`. */
export const searchTavily = async (
  query: string,
  deps: TavilyDeps,
  signal: AbortSignal,
): Promise<SearchResult[]> => {
  let response: Response;
  try {
    response = await deps.fetch(TAVILY_SEARCH_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(deps.apiKey
          ? { authorization: `Bearer ${deps.apiKey}` }
          : { 'x-tavily-access-mode': 'keyless' }),
      },
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
  return parsed.data.results.map(({ title, url, content }) => ({ title, url, snippet: content }));
};
