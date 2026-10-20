import type { AxiosRequestConfig } from 'axios';
import { SERVER_CONFIG } from '@/shared/config/serverConfig';

// Orval's mutator for the SSE stream: axios buffers the whole body, so this is a fetch that
// returns the Response unread. It never throws on a non-2xx; the caller reads the error envelope.
export const streamClient = async <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const hasBody = config.data !== undefined;
  const response = await fetch(SERVER_CONFIG.getApiEndpoint(config.url ?? ''), {
    method: config.method,
    // Only a request with a body declares one: a JSON content type on a GET forces a CORS preflight.
    ...(hasBody && {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config.data),
    }),
    // Carries the better-auth session cookie cross-origin, as the axios client does.
    credentials: 'include',
    signal: (options?.signal ?? config.signal) as AbortSignal | undefined,
  });
  // The generated signature says `string` (the OpenAPI 200 body); the runtime value is the Response.
  return response as T;
};

// The stream never rejects on a status, so there is no AppError to narrow to (unlike client.ts).
export type ErrorType<E> = E;
export type BodyType<B> = B;
