import { describe, expect, it } from 'vitest';
import { ChatMessageSkeleton } from '@/modules/chat/components/ChatMessageSkeleton';
import { renderWithProviders } from '@/test/render';

describe('ChatMessageSkeleton', () => {
  it('renders a single message skeleton', () => {
    const { container } = renderWithProviders(<ChatMessageSkeleton />);

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it('renders a user-aligned variant', () => {
    const assistant = renderWithProviders(<ChatMessageSkeleton />);
    const assistantHtml = assistant.container.innerHTML;
    assistant.unmount();

    const user = renderWithProviders(<ChatMessageSkeleton isUser />);

    expect(user.container.innerHTML).not.toBe(assistantHtml);
  });
});
