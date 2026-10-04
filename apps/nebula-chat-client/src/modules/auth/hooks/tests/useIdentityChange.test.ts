import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useIdentityChange } from '@/modules/auth/hooks/useIdentityChange';
import { SESSION_BOOTSTRAP_KEY } from '@/modules/auth/hooks/useSessionBootstrap';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { route } from '@/routing/routes';
import { createTestQueryClient, renderHookWithQueryClient } from '@/test/render';

const navigate = vi.fn();

vi.mock('react-router', () => ({ useNavigate: () => navigate }));

beforeEach(() => {
  vi.clearAllMocks();
  useChatStreamStore.setState({ isMessageAllowanceReached: false });
});

describe('useIdentityChange', () => {
  it("drops the previous user's server state but keeps the session bootstrap", () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['conversations'], []);
    queryClient.setQueryData(SESSION_BOOTSTRAP_KEY, true);
    const { result } = renderHookWithQueryClient(() => useIdentityChange(), { queryClient });

    act(() => result.current());

    expect(queryClient.getQueryData(['conversations'])).toBeUndefined();
    expect(queryClient.getQueryData(SESSION_BOOTSTRAP_KEY)).toBe(true);
  });

  it('returns to the chat root', () => {
    const { result } = renderHookWithQueryClient(() => useIdentityChange());

    act(() => result.current());

    expect(navigate).toHaveBeenCalledWith(route.chat.root());
  });

  it('forgets that the previous Guest reached their message allowance', () => {
    useChatStreamStore.setState({ isMessageAllowanceReached: true });
    const { result } = renderHookWithQueryClient(() => useIdentityChange());

    act(() => result.current());

    expect(useChatStreamStore.getState().isMessageAllowanceReached).toBe(false);
  });
});
