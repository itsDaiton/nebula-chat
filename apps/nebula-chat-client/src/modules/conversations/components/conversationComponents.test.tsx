import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationListItem } from '@/modules/conversations/components/ConversationListItem';
import { ConversationSkeletons } from '@/modules/conversations/components/ConversationSkeletons';
import { renderWithChakra } from '@/test/render';

const CONVERSATION_ID = '11111111-1111-4111-8111-111111111111';

const aConversation = (overrides = {}) => ({
  id: CONVERSATION_ID,
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

describe('ConversationListItem', () => {
  it('shows the conversation title', () => {
    renderWithChakra(
      <ConversationListItem
        conversation={aConversation({ createdAt: '2026-06-15T11:55:00.000Z' })}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText('Planning the migration')).toBeInTheDocument();
  });

  it('shows a relative timestamp', () => {
    renderWithChakra(
      <ConversationListItem
        conversation={aConversation({ createdAt: '2026-06-15T11:55:00.000Z' })}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
  });

  it('reports its id when clicked', async () => {
    const onClick = vi.fn();
    renderWithChakra(<ConversationListItem conversation={aConversation()} onClick={onClick} />);

    await userEvent.click(screen.getByText('Planning the migration'));

    expect(onClick).toHaveBeenCalledWith(CONVERSATION_ID);
  });

  it('renders differently when it is the open conversation', () => {
    const inactive = renderWithChakra(
      <ConversationListItem conversation={aConversation()} onClick={vi.fn()} />,
      { route: '/c/other-id' },
    );
    const inactiveHtml = inactive.container.innerHTML;
    inactive.unmount();

    const active = renderWithChakra(
      <ConversationListItem conversation={aConversation()} onClick={vi.fn()} />,
      { route: `/c/${CONVERSATION_ID}` },
    );

    expect(active.container.innerHTML).not.toBe(inactiveHtml);
  });
});

describe('ConversationSkeletons', () => {
  it('renders the configured default number of placeholders', () => {
    const { container } = renderWithChakra(<ConversationSkeletons />);

    expect(container.querySelectorAll('.chakra-skeleton').length).toBeGreaterThan(0);
  });

  it('renders exactly the requested count', () => {
    const { container: three } = renderWithChakra(<ConversationSkeletons count={3} />);
    const { container: six } = renderWithChakra(<ConversationSkeletons count={6} />);

    expect(six.querySelectorAll('.chakra-skeleton').length).toBe(
      three.querySelectorAll('.chakra-skeleton').length * 2,
    );
  });

  it('renders nothing for a count of zero', () => {
    const { container } = renderWithChakra(<ConversationSkeletons count={0} />);

    expect(container.querySelectorAll('.chakra-skeleton')).toHaveLength(0);
  });
});
