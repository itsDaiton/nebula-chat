import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useResetChat } from '@/shared/hooks/useResetChat';
import { useSearchStore } from '@/shared/stores/useSearchStore';

const navigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));

beforeEach(() => {
  vi.clearAllMocks();
  useSearchStore.setState({ isSearchOpen: false });
});

describe('useResetChat', () => {
  it('navigates back to the chat root', () => {
    const { result } = renderHook(() => useResetChat());

    act(() => result.current.resetChat());

    expect(navigate).toHaveBeenCalledWith({ to: '/' });
  });
});
