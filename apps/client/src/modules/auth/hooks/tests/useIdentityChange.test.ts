import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useIdentityChange } from '@/modules/auth/hooks/useIdentityChange';
import { SESSION_BOOTSTRAP_KEY } from '@/modules/auth/utils/sessionBootstrap';
import { useChatStreamStore } from '@/modules/chat/stores/useChatStreamStore';
import { useSettingsDialogStore } from '@/modules/settings/stores/useSettingsDialogStore';
import { createTestQueryClient, renderHookWithQueryClient } from '@/test/render';

const navigate = vi.fn();
const search = vi.hoisted(() => ({ current: {} as { device?: string } }));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  useSearch: () => search.current,
}));

beforeEach(() => {
  vi.clearAllMocks();
  search.current = {};
  useChatStreamStore.setState({ isMessageAllowanceReached: false });
});

describe('useIdentityChange', () => {
  it("drops the previous user's server state but keeps the session bootstrap", () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['sessions'], []);
    queryClient.setQueryData(SESSION_BOOTSTRAP_KEY, true);
    const { result } = renderHookWithQueryClient(() => useIdentityChange(), { queryClient });

    act(() => result.current());

    expect(queryClient.getQueryData(['sessions'])).toBeUndefined();
    expect(queryClient.getQueryData(SESSION_BOOTSTRAP_KEY)).toBe(true);
  });

  it('returns to the chat root', () => {
    const { result } = renderHookWithQueryClient(() => useIdentityChange());

    act(() => result.current());

    expect(navigate).toHaveBeenCalledWith({ to: '/' });
  });

  it('returns to the CLI code a sign-in was for', () => {
    search.current = { device: 'WDJB-MJHT' };
    const { result } = renderHookWithQueryClient(() => useIdentityChange());

    act(() => result.current());

    expect(navigate).toHaveBeenCalledWith({ to: '/device', search: { user_code: 'WDJB-MJHT' } });
  });

  it('forgets that the previous Guest reached their message allowance', () => {
    useChatStreamStore.setState({ isMessageAllowanceReached: true });
    const { result } = renderHookWithQueryClient(() => useIdentityChange());

    act(() => result.current());

    expect(useChatStreamStore.getState().isMessageAllowanceReached).toBe(false);
  });

  it("closes the previous user's Settings dialog", () => {
    useSettingsDialogStore.setState({ isOpen: true });
    const { result } = renderHookWithQueryClient(() => useIdentityChange());

    act(() => result.current());

    expect(useSettingsDialogStore.getState().isOpen).toBe(false);
  });
});
