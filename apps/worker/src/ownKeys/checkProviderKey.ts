import type { ModelProvider } from '@nebula-chat/contracts';

/** Asks the provider whether it accepts `apiKey`; throws when it cannot tell (an outage, a rate limit), so the job retries. */
export type ProviderKeyCheck = (
  provider: ModelProvider,
  apiKey: string,
) => Promise<'valid' | 'invalid'>;

// The model-list endpoints cost nothing, unlike a completion.
const requestFor = (provider: ModelProvider, apiKey: string): [url: string, init: RequestInit] =>
  provider === 'openai'
    ? ['https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } }]
    : [
        'https://api.anthropic.com/v1/models',
        { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } },
      ];

export const checkProviderKey =
  (fetchFn: typeof fetch, timeoutMs: number): ProviderKeyCheck =>
  async (provider, apiKey) => {
    const [url, init] = requestFor(provider, apiKey);
    const response = await fetchFn(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    if (response.ok) return 'valid';
    if (response.status === 401 || response.status === 403) return 'invalid';
    throw new Error(`${provider} model list answered ${response.status}`);
  };
