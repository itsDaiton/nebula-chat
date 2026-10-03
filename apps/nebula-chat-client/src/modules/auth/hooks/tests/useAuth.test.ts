import { renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { API_ROUTE } from '@/test/api';
import { aSession } from '@/test/auth';
import { server } from '@/test/msw';

// better-auth's session atom is a module singleton that skips a refetch within a second
// of the last one, so each test refetches explicitly rather than relying on mount.
const renderAuth = async (body: ReturnType<typeof aSession> | null) => {
  server.use(http.get(API_ROUTE.authSession, () => HttpResponse.json(body)));
  const hook = renderHook(() => useAuth());
  await hook.result.current.refetch();
  await waitFor(() => expect(hook.result.current.isPending).toBe(false));
  return hook;
};

describe('useAuth', () => {
  it('reports a Guest session', async () => {
    const { result } = await renderAuth(aSession({ isAnonymous: true }));

    await waitFor(() => expect(result.current.isGuest).toBe(true));
    expect(result.current.isRegistered).toBe(false);
    expect(result.current.user?.id).toBe('user-1');
  });

  it('reports a Registered user', async () => {
    const { result } = await renderAuth(aSession({ isAnonymous: false }));

    await waitFor(() => expect(result.current.isRegistered).toBe(true));
    expect(result.current.isGuest).toBe(false);
    expect(result.current.user?.email).toBe('ada@example.com');
  });

  it('reports no user when there is no session', async () => {
    const { result } = await renderAuth(null);

    await waitFor(() => expect(result.current.session).toBeNull());
    expect(result.current.user).toBeNull();
    expect(result.current.isGuest).toBe(false);
    expect(result.current.isRegistered).toBe(false);
  });
});
