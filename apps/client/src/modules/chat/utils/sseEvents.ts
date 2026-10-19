import type { SseEvent } from '@/modules/chat/types/types';

export const SSE_EVENTS: ReadonlySet<string> = new Set<SseEvent>([
  'token',
  'usage',
  'error',
  'end',
  'session-created',
  'user-message-created',
  'assistant-message-created',
]);
