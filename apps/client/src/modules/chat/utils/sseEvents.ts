import type { SseEvent } from '@/modules/chat/types/types';

export const SSE_EVENTS: ReadonlySet<string> = new Set<SseEvent>([
  'token',
  'usage',
  'error',
  'end',
  'step-finished',
  'run-waiting',
]);
