import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatContainerBox } from '@/modules/chat/components/ChatContainerBox';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { renderWithProviders } from '@/test/render';

beforeEach(() => {
  vi.clearAllMocks();
  useMessageStore.setState({ message: '' });
});

describe('ChatContainerBox', () => {
  it('renders its children', () => {
    renderWithProviders(
      <ChatContainerBox>
        <p>inner</p>
      </ChatContainerBox>,
    );

    expect(screen.getByText('inner')).toBeInTheDocument();
  });
});
