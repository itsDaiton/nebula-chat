import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationSkeletons } from '@/modules/conversations/components/ConversationSkeletons';
import { renderWithChakra } from '@/test/render';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ConversationSkeletons', () => {
  it('renders the configured default number of placeholders', () => {
    const { container } = renderWithChakra(<ConversationSkeletons />);

    expect(container.querySelectorAll('.chakra-skeleton').length).toBeGreaterThan(0);
  });

  it('renders exactly the requested count', () => {
    const { container: three } = renderWithChakra(<ConversationSkeletons count={3} />);
    const { container: six } = renderWithChakra(<ConversationSkeletons count={6} />);

    expect(six.querySelectorAll('.chakra-skeleton')).toHaveLength(
      three.querySelectorAll('.chakra-skeleton').length * 2,
    );
  });

  it('renders nothing for a count of zero', () => {
    const { container } = renderWithChakra(<ConversationSkeletons count={0} />);

    expect(container.querySelectorAll('.chakra-skeleton')).toHaveLength(0);
  });
});
