import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatScroller } from '@/shared/components/ui/chat-scroller';
import { useScrollPositionStore } from '@/shared/stores/useScrollPositionStore';

const scrollTo = vi.fn();

beforeEach(() => {
  useScrollPositionStore.setState({ isAtBottom: true });
  scrollTo.mockClear();
  window.HTMLElement.prototype.scrollTo = scrollTo;
});

const scrollAway = (viewport: HTMLElement, distanceFromBottom: number) => {
  Object.defineProperties(viewport, {
    scrollHeight: { value: 1000, configurable: true },
    clientHeight: { value: 400, configurable: true },
    scrollTop: { value: 600 - distanceFromBottom, configurable: true },
  });
  act(() => {
    fireEvent.scroll(viewport);
  });
};

describe('ChatScroller', () => {
  it('shows no scroll-to-bottom button at the bottom', () => {
    render(<ChatScroller>thread</ChatScroller>);

    expect(screen.queryByRole('button', { name: 'Scroll to bottom' })).not.toBeInTheDocument();
  });

  it('does not inherit a scrolled-up position from the previous thread', () => {
    useScrollPositionStore.setState({ isAtBottom: false });

    render(<ChatScroller>a short thread that fits</ChatScroller>);

    expect(screen.queryByRole('button', { name: 'Scroll to bottom' })).not.toBeInTheDocument();
  });

  it('shows the button once the reader scrolls up, and scrolls to the end on click', async () => {
    const { container } = render(<ChatScroller>thread</ChatScroller>);
    scrollAway(container.querySelector('[data-slot="chat-scroller-viewport"]')!, 300);

    await userEvent.click(await screen.findByRole('button', { name: 'Scroll to bottom' }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: 'smooth' });
  });

  it('hides the button again when the reader returns to the bottom', () => {
    const { container } = render(<ChatScroller>thread</ChatScroller>);
    const viewport = container.querySelector<HTMLElement>('[data-slot="chat-scroller-viewport"]')!;

    scrollAway(viewport, 300);
    scrollAway(viewport, 10);

    expect(screen.queryByRole('button', { name: 'Scroll to bottom' })).not.toBeInTheDocument();
  });
});
