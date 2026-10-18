import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockGetSession } from '@/test/auth';
import { server } from '@/test/msw';

describe('authClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('sends the session cookie on its requests', async () => {
    // msw 3 no longer exposes `credentials` on the intercepted request, and better-auth
    // captures `fetch` on import, so the spy goes in before a fresh import of the client.
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    vi.resetModules();
    server.use(mockGetSession(null));
    const { authClient } = await import('@/libs/auth/client');

    await authClient.getSession();

    expect(fetchSpy).toHaveBeenCalled();
    expect(fetchSpy.mock.calls.every(([, init]) => init?.credentials === 'include')).toBe(true);
  });
});
