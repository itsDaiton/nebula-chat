import { describe, expect, it } from 'vitest';
import { ChatMessagesSkeletons } from '@/modules/chat/components/ChatMessagesSkeletons';
import { renderWithChakra } from '@/test/render';

describe('ChatMessagesSkeletons', () => {
  it('renders a group of skeletons', () => {
    const { container } = renderWithChakra(<ChatMessagesSkeletons />);

    expect(container.querySelectorAll('.chakra-skeleton').length).toBeGreaterThan(1);
  });
});
