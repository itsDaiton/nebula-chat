import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionSkeletons } from '@/modules/sessions/components/SessionSkeletons';
import { renderWithChakra } from '@/test/render';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SessionSkeletons', () => {
  it('renders the configured default number of placeholders', () => {
    const { container } = renderWithChakra(<SessionSkeletons />);

    expect(container.querySelectorAll('.chakra-skeleton').length).toBeGreaterThan(0);
  });

  it('renders exactly the requested count', () => {
    const { container: three } = renderWithChakra(<SessionSkeletons count={3} />);
    const { container: six } = renderWithChakra(<SessionSkeletons count={6} />);

    expect(six.querySelectorAll('.chakra-skeleton')).toHaveLength(
      three.querySelectorAll('.chakra-skeleton').length * 2,
    );
  });

  it('renders nothing for a count of zero', () => {
    const { container } = renderWithChakra(<SessionSkeletons count={0} />);

    expect(container.querySelectorAll('.chakra-skeleton')).toHaveLength(0);
  });
});
