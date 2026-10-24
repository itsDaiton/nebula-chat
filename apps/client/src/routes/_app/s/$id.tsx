import { createFileRoute } from '@tanstack/react-router';
import { getListMessagesQueryOptions } from '@/libs/api/generated/messages/messages';
import { getGetSessionQueryOptions } from '@/libs/api/generated/sessions/sessions';
import { ChatPage } from '@/modules/chat/ChatPage';

const INLINE_ERROR = { inlineError: true };

export const Route = createFileRoute('/_app/s/$id')({
  // Warms the cache the page's hooks read. A failure (someone else's Session) is the page's to show
  // and toast, so the prefetch stays quiet and doesn't throw.
  loader: async ({ context: { queryClient }, params: { id } }) => {
    await Promise.allSettled([
      queryClient.ensureQueryData({ ...getGetSessionQueryOptions(id), meta: INLINE_ERROR }),
      queryClient.ensureQueryData({
        ...getListMessagesQueryOptions({ sessionId: id }),
        meta: INLINE_ERROR,
      }),
    ]);
  },
  component: ChatPage,
});
