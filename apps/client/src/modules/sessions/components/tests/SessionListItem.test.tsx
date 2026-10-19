import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionListItem } from '@/modules/sessions/components/SessionListItem';
import { renderWithChakra } from '@/test/render';

const SESSION_ID = '11111111-1111-4111-8111-111111111111';

const aSession = (overrides = {}) => ({
  id: SESSION_ID,
  title: 'Planning the migration',
  createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SessionListItem', () => {
  it('shows the session title', () => {
    renderWithChakra(
      <SessionListItem
        session={aSession({ createdAt: '2026-06-15T11:55:00.000Z' })}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText('Planning the migration')).toBeInTheDocument();
  });

  it('shows a relative timestamp', () => {
    renderWithChakra(
      <SessionListItem
        session={aSession({ createdAt: '2026-06-15T11:55:00.000Z' })}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
  });

  it('reports its id when clicked', async () => {
    const onClick = vi.fn();
    renderWithChakra(<SessionListItem session={aSession()} onClick={onClick} />);

    await userEvent.click(screen.getByText('Planning the migration'));

    expect(onClick).toHaveBeenCalledWith(SESSION_ID);
  });

  it('renders differently when it is the open session', () => {
    const inactive = renderWithChakra(<SessionListItem session={aSession()} onClick={vi.fn()} />, {
      route: '/s/other-id',
    });
    const inactiveHtml = inactive.container.innerHTML;
    inactive.unmount();

    const active = renderWithChakra(<SessionListItem session={aSession()} onClick={vi.fn()} />, {
      route: `/s/${SESSION_ID}`,
    });

    expect(active.container.innerHTML).not.toBe(inactiveHtml);
  });
});
