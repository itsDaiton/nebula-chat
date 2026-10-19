import { getGetMessageAllowanceMockHandler } from '@/libs/api/generated/chat/chat.msw';
import { getListSessionsMockHandler } from '@/libs/api/generated/sessions/sessions.msw';
import { server } from '@/test/msw';

/** Serves what the chat page loads, for a route test whose flow lands there. */
export const serveChatPage = () =>
  server.use(
    getListSessionsMockHandler({ sessions: [], nextCursor: null, hasMore: false }),
    getGetMessageAllowanceMockHandler({ metered: false }),
  );
