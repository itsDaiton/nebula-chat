import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWaitingPhrase } from '@/modules/chat/hooks/useWaitingPhrase';
import { useAppearanceStore } from '@/shared/stores/useAppearanceStore';
import { WAITING_PHRASES } from '@/waitingPhrases';

describe('useWaitingPhrase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    useAppearanceStore.setState({ motion: 'system' });
  });

  it('shows a phrase from the list and swaps it for a different one every 3 seconds', () => {
    useAppearanceStore.setState({ motion: 'full' });
    const { result } = renderHook(() => useWaitingPhrase());
    const first = result.current;
    expect(WAITING_PHRASES).toContain(first);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(WAITING_PHRASES).toContain(result.current);
    expect(result.current).not.toBe(first);
  });

  it('keeps the phrase put with motion reduced', () => {
    useAppearanceStore.setState({ motion: 'reduced' });
    const { result } = renderHook(() => useWaitingPhrase());
    const first = result.current;

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(result.current).toBe(first);
  });

  it('keeps the phrase put when the system asks for reduced motion', () => {
    useAppearanceStore.setState({ motion: 'system' });
    vi.mocked(window.matchMedia).mockImplementation(
      (query: string) => ({ matches: true, media: query }) as MediaQueryList,
    );
    const { result } = renderHook(() => useWaitingPhrase());
    const first = result.current;

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(result.current).toBe(first);
  });
});
