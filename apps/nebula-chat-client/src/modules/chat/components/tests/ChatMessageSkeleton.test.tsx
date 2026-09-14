import { describe, expect, it } from 'vitest';
import { ChatMessageSkeleton } from '@/modules/chat/components/ChatMessageSkeleton';
import { renderWithChakra } from '@/test/render';

describe('ChatMessageSkeleton', () => {
  it('renders a single message skeleton', () => {
    const { container } = renderWithChakra(<ChatMessageSkeleton />);

    expect(container.querySelectorAll('.chakra-skeleton').length).toBeGreaterThan(0);
  });

  it('renders a user-aligned variant', () => {
    const assistant = renderWithChakra(<ChatMessageSkeleton />);
    const assistantHtml = assistant.container.innerHTML;
    assistant.unmount();

    const user = renderWithChakra(<ChatMessageSkeleton isUser />);

    expect(user.container.innerHTML).not.toBe(assistantHtml);
  });
});
