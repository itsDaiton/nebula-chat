import type { ReplyEnd, ReplyState } from '@/modules/chat/types/types';

export const IDLE_REPLY: ReplyEnd = { status: 'idle' };

// Navigating counts: the reply is over, but the composer stays busy until the new route renders.
export const isReplyInFlight = ({ status }: ReplyState): boolean =>
  status === 'sending' || status === 'streaming' || status === 'navigating';
