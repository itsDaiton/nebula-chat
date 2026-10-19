import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ChatEmptyState } from '@/modules/chat/components/ChatEmptyState';
import { resources } from '@/resources';
import { useMultiLineStore } from '@/shared/stores/useMultiLineStore';
import { renderWithChakra } from '@/test/render';

beforeEach(() => {
  useMultiLineStore.setState({ multiLineMap: {} });
});

describe('ChatEmptyState', () => {
  it('welcomes a brand new chat', () => {
    renderWithChakra(<ChatEmptyState sessionId={undefined} />);

    expect(screen.getByText(resources.chat.welcomeMessage)).toBeInTheDocument();
    expect(screen.getByText(resources.chat.welcomeIntro)).toBeInTheDocument();
  });

  it('shows the empty-session copy for an existing session', () => {
    renderWithChakra(<ChatEmptyState sessionId="c1" />);

    expect(screen.getByText(resources.chat.emptySession)).toBeInTheDocument();
    expect(screen.getByText(resources.chat.emptySessionHint)).toBeInTheDocument();
  });
});
