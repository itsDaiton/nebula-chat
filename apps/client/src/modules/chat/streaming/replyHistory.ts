import type { ChatMessage } from '@/modules/chat/types/types';
import { EMPTY_RUN } from '@/modules/chat/streaming/runProgress';

// The chat with its trailing assistant Message updated; unchanged without one.
export const withReply = (
  history: ChatMessage[],
  update: (reply: ChatMessage) => ChatMessage,
): ChatMessage[] => {
  const last = history.at(-1);
  return last?.role === 'assistant' ? [...history.slice(0, -1), update(last)] : history;
};

// The sent messages and an empty reply for the stream to fill.
export const withEmptyReply = (messages: ChatMessage[]): ChatMessage[] => [
  ...messages,
  { id: crypto.randomUUID(), role: 'assistant', content: '' },
];

// The Run exists from the send on, so its progress shows before the first Step.
export const startRun = (history: ChatMessage[], runId: string): ChatMessage[] =>
  withReply(history, (last) => ({ ...last, runId, run: EMPTY_RUN }));

// The error replaces the reply's text; a Run's reply is marked failed with it.
export const failReply = (history: ChatMessage[], message: string): ChatMessage[] =>
  withReply(history, (last) => {
    // A failed Run reports the `error` first, and the read stops there, before its `run-finished`.
    const run = last.run && { ...last.run, status: 'failed' as const };
    return { ...last, content: message, ...(run && { run }) };
  });
