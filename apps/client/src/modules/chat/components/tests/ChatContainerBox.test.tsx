import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatContainerBox } from '@/modules/chat/components/ChatContainerBox';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { useModelSelectorStore } from '@/modules/chat/stores/useModelSelectorStore';
import { renderWithChakra } from '@/test/render';

beforeEach(() => {
  vi.clearAllMocks();
  useMessageStore.setState({ message: '' });
  useModelSelectorStore.setState({ isSelectOpen: false, triggerWidth: 120 });
});

describe('ChatContainerBox', () => {
  it('renders its children', () => {
    renderWithChakra(
      <ChatContainerBox>
        <p>inner</p>
      </ChatContainerBox>,
    );

    expect(screen.getByText('inner')).toBeInTheDocument();
  });
});
