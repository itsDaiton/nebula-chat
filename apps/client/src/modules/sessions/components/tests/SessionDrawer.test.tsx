import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionDrawer } from '@/modules/sessions/components/SessionDrawer';
import { useSessionsSearchStore } from '@/modules/sessions/stores/useSessionsSearchStore';
import { renderWithChakra } from '@/test/render';

beforeEach(() => {
  useSessionsSearchStore.getState().clearSearch();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SessionDrawer', () => {
  it('renders nothing while closed', () => {
    const { container } = renderWithChakra(
      <SessionDrawer
        isDrawerOpen={false}
        closeDrawer={vi.fn()}
        toggleSearch={vi.fn()}
        closeSearch={vi.fn()}
      />,
    );

    expect(container.textContent).toBe('');
  });
});
