import type { ReplyStreamEvent } from '@nebula-chat/contracts';

// One SSE event named by the event's `type`, its data the rest of it. `id` is the stream entry id,
// so a reconnecting client can say where it got to.
export const sseEvent = (event: ReplyStreamEvent, id?: string): string => {
  const { type, ...data } = event;
  const idLine = id === undefined ? '' : `id: ${id}\n`;
  return `${idLine}event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
};

/** An SSE comment: ignored by clients, but it keeps proxies from closing an idle stream. */
export const SSE_KEEP_ALIVE = ': keep-alive\n\n';
