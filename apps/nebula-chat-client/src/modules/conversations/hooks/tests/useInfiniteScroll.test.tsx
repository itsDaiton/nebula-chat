import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useInfiniteScroll } from '@/modules/conversations/hooks/useInfiniteScroll';
import { useConversationStore } from '@/modules/conversations/stores/useConversationStore';

/** Captures the observer instances the hook creates. */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(
    public callback: IntersectionObserverCallback,
    public options?: IntersectionObserverInit,
  ) {
    FakeIntersectionObserver.instances.push(this);
  }
  trigger(isIntersecting: boolean) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as never);
  }
}

beforeEach(() => {
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  useConversationStore.setState({
    conversationId: null,
    conversation: null,
    isLoading: false,
    error: null,
  });
});

describe('useInfiniteScroll', () => {
  const setup = (overrides: Partial<Parameters<typeof useInfiniteScroll>[0]> = {}) => {
    const onLoadMore = vi.fn();
    const hook = renderHook(() =>
      useInfiniteScroll({ hasMore: true, isLoading: false, onLoadMore, ...overrides }),
    );
    return { onLoadMore, ...hook };
  };

  const attach = (observerTarget: ReturnType<typeof useInfiniteScroll>) => {
    observerTarget(document.createElement('div'));
    return FakeIntersectionObserver.instances.at(-1)!;
  };

  it('loads the next page when the sentinel scrolls into view', () => {
    const { result, onLoadMore } = setup();

    attach(result.current).trigger(true);

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does nothing while the sentinel is out of view', () => {
    const { result, onLoadMore } = setup();

    attach(result.current).trigger(false);

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not load past the last page', () => {
    const { result, onLoadMore } = setup({ hasMore: false });

    attach(result.current).trigger(true);

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not stack a second request while one is in flight', () => {
    const { result, onLoadMore } = setup({ isLoading: true });

    attach(result.current).trigger(true);

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('observes the node it is given', () => {
    const { result } = setup();

    const observer = attach(result.current);

    expect(observer.observe).toHaveBeenCalled();
  });

  it('disconnects when the sentinel detaches, so no observer leaks', () => {
    const { result } = setup();
    const observer = attach(result.current);

    result.current(null);

    expect(observer.disconnect).toHaveBeenCalled();
  });

  it('honours a custom threshold', () => {
    const { result } = setup({ threshold: 0.9 });

    const observer = attach(result.current);

    expect(observer.options?.threshold).toBe(0.9);
  });
});
