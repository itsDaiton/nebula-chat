import { describe, expect, it } from 'vitest';
import { ChatMessagesSkeletons } from '@/modules/chat/components/ChatMessagesSkeletons';
import { renderWithProviders } from '@/test/render';

describe('ChatMessagesSkeletons', () => {
  it('renders a group of skeletons', () => {
    const { container } = renderWithProviders(<ChatMessagesSkeletons />);

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(1);
  });
});
