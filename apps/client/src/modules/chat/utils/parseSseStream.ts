import type { SseEvent, SseFrame } from '@/modules/chat/types/types';
import { SSE_EVENTS } from '@/modules/chat/utils/sseEvents';

const frameOf = (block: string): SseFrame | null => {
  let event: string | null = null;
  let id: string | undefined;
  const data: string[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('event: ')) event = line.slice(7);
    else if (line.startsWith('data: ')) data.push(line.slice(6));
    else if (line.startsWith('id: ')) id = line.slice(4);
    // `:` comments (keep-alives) carry nothing the reply needs.
  }
  if (event === null || !SSE_EVENTS.has(event)) return null;
  return { event: event as SseEvent, data: data.join('\n'), ...(id === undefined ? {} : { id }) };
};

/**
 * The known events of an SSE body, in order. The reader hands back arbitrary byte
 * slices, so a partial event is buffered until its blank-line terminator arrives.
 */
export const parseSseStream = async function* (
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SseFrame> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';
      for (const block of blocks) {
        const frame = frameOf(block);
        if (frame) yield frame;
      }
    }
  } finally {
    reader.releaseLock();
  }
};
