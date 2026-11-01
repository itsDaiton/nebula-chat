import type { Message } from '@/libs/api/generated/model/message';
import type { ChatMessage } from '@/modules/chat/types/types';

// The API starts returning these with NEB-665; until then they are absent and the meta row skips them.
type MessageMeta = Partial<Pick<ChatMessage, 'model' | 'estimatedCostUsd' | 'runId'>>;

const CHAT_ROLES: ReadonlySet<string> = new Set<ChatMessage['role']>(['user', 'assistant']);

const isChatRole = (role: string): role is ChatMessage['role'] => CHAT_ROLES.has(role);

/** Drops roles the chat view can't render; the API types `role` as a plain string. */
export const mapSessionMessages = (messages: (Message & MessageMeta)[]): ChatMessage[] =>
  messages.flatMap(({ id, role, content, tokenCount, model, estimatedCostUsd, runId }) =>
    isChatRole(role) ? [{ id, role, content, tokenCount, model, estimatedCostUsd, runId }] : [],
  );
