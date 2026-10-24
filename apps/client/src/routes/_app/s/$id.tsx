import { createFileRoute } from '@tanstack/react-router';
import { getListMessagesQueryOptions } from '@/libs/api/generated/messages/messages';
import { getGetSessionQueryOptions } from '@/libs/api/generated/sessions/sessions';
import { ChatPage } from '@/modules/chat/ChatPage';

// A failed prefetch isn't retried: the page's own query retries it, and a failing Session would otherwise be fetched twice over.
const QUIET_PREFETCH = { meta: { inlineError: true }, retry: false };

export const Route = createFileRoute('/_app/s/$id')({
  // Warms the cache the page's hooks read. A failure (someone else's Session) is the page's to show
  // and toast, so the prefetch stays quiet and doesn't throw.
  loader: async ({ context: { queryClient }, params: { id } }) => {
    await Promise.allSettled([
      queryClient.ensureQueryData({ ...getGetSessionQueryOptions(id), ...QUIET_PREFETCH }),
      queryClient.ensureQueryData({
        ...getListMessagesQueryOptions({ sessionId: id }),
        ...QUIET_PREFETCH,
      }),
    ]);
  },
  component: ChatPage,
});
