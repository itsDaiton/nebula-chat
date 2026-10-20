import { HttpResponse, http } from 'msw';
import { getGetMessageAllowanceMockHandler } from '@/libs/api/generated/chat/chat.msw';
import { getListSessionsMockHandler } from '@/libs/api/generated/sessions/sessions.msw';
import { API_ROUTE } from '@/test/api';
import { server } from '@/test/msw';

/** Serves what the chat page loads, for a route test whose flow lands there. */
export const serveChatPage = () =>
  server.use(
    getListSessionsMockHandler({ sessions: [], nextCursor: null, hasMore: false }),
    getGetMessageAllowanceMockHandler({ metered: false }),
  );

/** One SSE event as the server relays it; `id` is the stream entry id. */
export const sseFrame = (event: string, data: unknown, id?: string) =>
  `${id === undefined ? '' : `id: ${id}\n`}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

/** A reply stream response that streams `chunks` one at a time, as the network would. */
const sseResponse = (...chunks: string[]) =>
  new HttpResponse(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream' } },
  );

/** Serves `chunks` as every reply stream (`GET /api/streams/:streamId`). */
export const mockReplyStream = (...chunks: string[]) =>
  http.get(API_ROUTE.replyStream, () => sseResponse(...chunks));
