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

  it('allows the configured client origin', async () => {
    const options = await loadCorsOptions({ CLIENT_URL: 'https://app.example.com' });

    await expect(allows(options, 'https://app.example.com')).resolves.toBe(true);
  });

  it('allows the configured server origin', async () => {
    const options = await loadCorsOptions({ SERVER_URL: 'https://api.example.com' });

    await expect(allows(options, 'https://api.example.com')).resolves.toBe(true);
  });

  it('rejects an origin that is not on the allow-list', async () => {
    const options = await loadCorsOptions({ CLIENT_URL: 'https://app.example.com' });

    await expect(allows(options, 'https://evil.example.com')).resolves.toBe(false);
  });

  it('allows a request with no Origin header, so same-origin and curl still work', async () => {
    const options = await loadCorsOptions({ CLIENT_URL: 'https://app.example.com' });

    await expect(allows(options, undefined)).resolves.toBe(true);
  });

  it('matches origins exactly rather than by prefix', async () => {
    const options = await loadCorsOptions({ CLIENT_URL: 'https://app.example.com' });

    await expect(allows(options, 'https://app.example.com.evil.test')).resolves.toBe(false);
  });

  it('drops unset origins from the allow-list instead of matching undefined', async () => {
    const options = await loadCorsOptions({ CLIENT_URL: 'https://app.example.com' });

    await expect(allows(options, '')).resolves.toBe(true);
  });

  it('never surfaces an error to the CORS callback', async () => {
    const options = await loadCorsOptions({ CLIENT_URL: 'https://app.example.com' });

    await expect(allows(options, 'https://evil.example.com')).resolves.toBe(false);
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
