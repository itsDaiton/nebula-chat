import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionsSearch } from '@/modules/sessions/components/SessionsSearch';
import { useSessionsSearchStore } from '@/modules/sessions/stores/useSessionsSearchStore';
import { renderInRouter } from '@/test/renderRoute';

const aSession = (id: string, title = `Session ${id}`) => ({
  id,
  title,
  createdAt: '2026-06-15T11:55:00.000Z',
  archived: false,
});

beforeEach(() => {
  useSessionsSearchStore.getState().clearSearch();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SessionsSearch', () => {
  const props = {
    sessions: [aSession('a', 'First chat'), aSession('b', 'Second chat')],
    onSessionClick: vi.fn(),
    onClose: vi.fn(),
  };

  it('renders a search box', async () => {
    await renderInRouter(<SessionsSearch {...props} />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('lists the local sessions before any query is typed', async () => {
    await renderInRouter(<SessionsSearch {...props} />);

    expect(screen.getByText('First chat')).toBeInTheDocument();
    expect(screen.getByText('Second chat')).toBeInTheDocument();
  });

  it('reports the selected session', async () => {
    const onSessionClick = vi.fn();
    await renderInRouter(<SessionsSearch {...props} onSessionClick={onSessionClick} />);

    await userEvent.click(screen.getByText('First chat'));

    expect(onSessionClick).toHaveBeenCalledWith('a');
  });
});
