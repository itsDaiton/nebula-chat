import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionListItem } from '@/modules/sessions/components/SessionListItem';
import { renderInRouter } from '@/test/renderRoute';

const SESSION_ID = '11111111-1111-4111-8111-111111111111';

const aSession = (overrides = {}) => ({
  id: SESSION_ID,
  title: 'Planning the migration',
  createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  archived: false,
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
  it('shows the session title', async () => {
    await renderInRouter(
      <SessionListItem
        session={aSession({ createdAt: '2026-06-15T11:55:00.000Z' })}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText('Planning the migration')).toBeInTheDocument();
  });

  it('shows a relative timestamp', async () => {
    await renderInRouter(
      <SessionListItem
        session={aSession({ createdAt: '2026-06-15T11:55:00.000Z' })}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
  });

  it('reports its id when clicked', async () => {
    const onClick = vi.fn();
    await renderInRouter(<SessionListItem session={aSession()} onClick={onClick} />);

    await userEvent.click(screen.getByText('Planning the migration'));

    expect(onClick).toHaveBeenCalledWith(SESSION_ID);
  });

  it('renders differently when it is the open session', async () => {
    const inactive = await renderInRouter(
      <SessionListItem session={aSession()} onClick={vi.fn()} />,
      {
        path: '/s/other-id',
      },
    );
    const inactiveHtml = inactive.container.innerHTML;
    inactive.unmount();

    const active = await renderInRouter(
      <SessionListItem session={aSession()} onClick={vi.fn()} />,
      {
        path: `/s/${SESSION_ID}`,
      },
    );

    expect(active.container.innerHTML).not.toBe(inactiveHtml);
  });
});
