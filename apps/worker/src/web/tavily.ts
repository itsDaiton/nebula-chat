import { z } from 'zod';
import { WebToolError } from '@worker/web/webToolError';

export type TavilyDeps = {
  /** Without one the request is keyless: Search and Extract still answer, rate-limited. */
  apiKey: string | undefined;
  fetch: typeof globalThis.fetch;
  maxResults: number;
};

const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';
const TAVILY_EXTRACT_URL = 'https://api.tavily.com/extract';

const tavilyResponseSchema = z.object({
  results: z.array(z.object({ title: z.string(), url: z.string(), content: z.string() })),
});

// Field names follow Tavily's Extract reference as relayed by third-party docs; verify against docs.tavily.com.
const extractResponseSchema = z.object({
  results: z.array(z.object({ url: z.string(), raw_content: z.string() })),
  failed_results: z.array(z.object({ url: z.string() })).default([]),
});

type SearchResult = { title: string; url: string; snippet: string };

const post = async (
  endpoint: string,
  body: Record<string, unknown>,
  { apiKey, fetch }: Pick<TavilyDeps, 'apiKey' | 'fetch'>,
  signal: AbortSignal,
): Promise<unknown> => {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : { 'x-tavily-access-mode': 'keyless' }),
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (signal.aborted) throw err;
    throw new WebToolError('provider-error', 'The search provider could not be reached.');
  }
  if (!response.ok) {
    throw new WebToolError('provider-error', `The search provider answered ${response.status}.`);
  }
  return response.json().catch((err) => {
    if (signal.aborted) throw err;
    return null;
  });
};

/** Tavily's results for `query`, mapped to a compact list; any failure of the provider is a `provider-error`. */
export const searchTavily = async (
  query: string,
  deps: TavilyDeps,
  signal: AbortSignal,
): Promise<SearchResult[]> => {
  const parsed = tavilyResponseSchema.safeParse(
    await post(
      TAVILY_SEARCH_URL,
      { query, max_results: deps.maxResults, search_depth: 'basic' },
      deps,
      signal,
    ),
  );
  if (!parsed.success) {
    throw new WebToolError('provider-error', 'The search provider answered in an unknown shape.');
  }
  return parsed.data.results.map(({ title, url, content }) => ({ title, url, snippet: content }));
};

/** The main text of one page, extracted by Tavily; a page it could not read is `unsupported-content`. */
export const extractTavily = async (
  url: string,
  deps: Pick<TavilyDeps, 'apiKey' | 'fetch'>,
  signal: AbortSignal,
): Promise<string> => {
  const parsed = extractResponseSchema.safeParse(
    await post(TAVILY_EXTRACT_URL, { urls: [url], extract_depth: 'basic' }, deps, signal),
  );
  if (!parsed.success) {
    throw new WebToolError('provider-error', 'The search provider answered in an unknown shape.');
  }
  const text = parsed.data.results[0]?.raw_content.trim() ?? '';
  if (!text || parsed.data.failed_results.length > 0) {
    throw new WebToolError('unsupported-content', `The search provider could not read ${url}.`);
  }
  return text;
};
