import { beforeEach, describe, expect, it } from 'vitest';
import { ChatIcon } from '@/modules/chat/components/ChatIcon';
import { useMultiLineStore } from '@/shared/stores/useMultiLineStore';
import { renderWithChakra } from '@/test/render';

beforeEach(() => {
  useMultiLineStore.setState({ multiLineMap: {} });
});

describe('ChatIcon', () => {
  it('renders for a user message', () => {
    const { container } = renderWithChakra(<ChatIcon isUser />);

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders a different icon for the assistant', () => {
    const { container: user } = renderWithChakra(<ChatIcon isUser />);
    const { container: assistant } = renderWithChakra(<ChatIcon isUser={false} />);

    expect(user.innerHTML).not.toBe(assistant.innerHTML);
  });
});
