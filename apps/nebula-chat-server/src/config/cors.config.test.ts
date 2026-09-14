import { afterEach, describe, expect, it, vi } from 'vitest';

const mockEnv: { CLIENT_URL?: string; SERVER_URL?: string } = {};

vi.mock('@backend/env', () => ({ env: mockEnv }));

/**
 * The allow-list is captured when the module loads, so each scenario sets the
 * env and re-imports rather than mutating a live module.
 */
const loadCorsOptions = async (env: typeof mockEnv) => {
  Object.assign(mockEnv, { CLIENT_URL: undefined, SERVER_URL: undefined }, env);
  vi.resetModules();
  const mod = await import('@backend/config/cors.config');
  return mod.corsOptions;
};

const allows = (options: Awaited<ReturnType<typeof loadCorsOptions>>, origin: string | undefined) =>
  new Promise<boolean>((resolve, reject) => {
    options.origin(origin, (err, allow) => (err ? reject(err) : resolve(allow)));
  });

describe('corsOptions.origin', () => {
  afterEach(() => {
    vi.resetModules();
  });

  // One allow-list (CLIENT_URL only), every origin decision it has to make.
  // `allows` rejects if the CORS callback is ever handed an error, so each row
  // also asserts that a denial is a plain `false` rather than a thrown error.
  it.each([
    ['the configured client origin', 'https://app.example.com', true],
    ['an origin that is not on the allow-list', 'https://evil.example.com', false],
    // Exact match, not prefix: a suffixed look-alike domain must not pass.
    ['a look-alike origin that only shares a prefix', 'https://app.example.com.evil.test', false],
    // No Origin header at all — same-origin requests and curl.
    ['a request with no Origin header', undefined, true],
    // An unset allow-list entry is dropped rather than matched against ''.
    ['an empty origin', '', true],
  ])('decides %s as %s', async (_case, origin, expected) => {
    const options = await loadCorsOptions({ CLIENT_URL: 'https://app.example.com' });

    await expect(allows(options, origin)).resolves.toBe(expected);
  });

  it('allows the configured server origin', async () => {
    const options = await loadCorsOptions({ SERVER_URL: 'https://api.example.com' });

    await expect(allows(options, 'https://api.example.com')).resolves.toBe(true);
  });
});

describe('corsOptions', () => {
  it('sends credentials and restricts methods and headers', async () => {
    const options = await loadCorsOptions({ CLIENT_URL: 'https://app.example.com' });

    expect(options.credentials).toBe(true);
    expect(options.methods).toEqual(['GET', 'HEAD', 'POST', 'DELETE', 'OPTIONS']);
    expect(options.allowedHeaders).toEqual(['Content-Type']);
  });

  it('caches the preflight response for a day', async () => {
    const options = await loadCorsOptions({ CLIENT_URL: 'https://app.example.com' });

    expect(options.maxAge).toBe(86_400);
  });
});
