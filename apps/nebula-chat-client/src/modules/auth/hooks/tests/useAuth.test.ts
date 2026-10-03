import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { authClient } from '@/libs/auth/client';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { aSession, mockGetSession } from '@/test/auth';
import { server } from '@/test/msw';

// The session store is a module singleton that skips a refetch within a second of the last,
// so each test fires the signal better-auth's own sign-in and sign-out calls fire.
const renderAuth = async (body: ReturnType<typeof aSession> | null) => {
  server.use(mockGetSession(body));
  const hook = renderHook(() => useAuth());
  act(() => authClient.$store.notify('$sessionSignal'));
  await waitFor(() => expect(hook.result.current.user?.id ?? null).toBe(body?.user.id ?? null));
  return hook;
};

describe('useAuth', () => {
  it('reports a Guest session', async () => {
    const { result } = await renderAuth(aSession({ isAnonymous: true }));

    await waitFor(() => expect(result.current.isGuest).toBe(true));
    expect(result.current.isRegistered).toBe(false);
  });

  it('reports a Registered user', async () => {
    const { result } = await renderAuth(aSession({ isAnonymous: false }));

    await waitFor(() => expect(result.current.isRegistered).toBe(true));
    expect(result.current.isGuest).toBe(false);
    expect(result.current.user?.email).toBe('ada@example.com');
  });

  it('reports no user when there is no session', async () => {
    const { result } = await renderAuth(null);

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.session).toBeNull();
    expect(result.current.isGuest).toBe(false);
    expect(result.current.isRegistered).toBe(false);
  });
});
