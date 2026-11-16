import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionSkeletons } from '@/modules/sessions/components/SessionSkeletons';
import { render } from '@testing-library/react';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SessionSkeletons', () => {
  it('renders the configured default number of placeholders', () => {
    const { container } = render(<SessionSkeletons />);

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it('renders exactly the requested count', () => {
    const { container: three } = render(<SessionSkeletons count={3} />);
    const { container: six } = render(<SessionSkeletons count={6} />);

    expect(six.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(
      three.querySelectorAll('[data-slot="skeleton"]').length * 2,
    );
  });

  it('renders nothing for a count of zero', () => {
    const { container } = render(<SessionSkeletons count={0} />);

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(0);
  });
});
