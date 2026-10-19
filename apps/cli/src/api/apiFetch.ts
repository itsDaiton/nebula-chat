import { CliError } from '@cli/errors';

/** Which server a request goes to and with what credentials: the profile's URL and an auth header. */
export type ApiTarget = {
  baseUrl: string;
  fetch: typeof globalThis.fetch;
  headers: Record<string, string>;
};

type ApiResponse = { data: unknown; status: number; headers: Headers };

const readBody = async (res: Response): Promise<unknown> => {
  const text = await res.text();
  if (!res.headers.get('content-type')?.includes('json') || text === '') return text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

/**
 * Orval's mutator. Never throws on a status: callers narrow the generated response union.
 * `target` is optional only because Orval spreads the options object; every call passes one.
 */
export const apiFetch = async <T extends ApiResponse>(
  path: string,
  { target, headers, ...init }: RequestInit & { target?: ApiTarget },
): Promise<T> => {
  if (target === undefined) throw new Error(`apiFetch: no target for ${path}`);
  let res: Response;
  try {
    res = await target.fetch(`${target.baseUrl}${path}`, {
      ...init,
      headers: { ...(headers as Record<string, string>), ...target.headers },
    });
  } catch (err) {
    const reason = err instanceof Error ? (err.cause ?? err).toString() : String(err);
    throw new CliError(`Could not reach ${target.baseUrl}: ${reason}`);
  }
  return { data: await readBody(res), status: res.status, headers: res.headers } as T;
};
