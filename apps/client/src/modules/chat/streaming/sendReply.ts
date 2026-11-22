import { AppError } from '@nebula-chat/errors';
import type { QueryClient } from '@tanstack/react-query';
import { getGetMessageAllowanceQueryOptions } from '@/libs/api/generated/chat/chat';
import type { SendMessageBodyMode } from '@/libs/api/generated/model/sendMessageBodyMode';
import { ErrorCode } from '@/libs/api/generated/model/errorCode';
import type {
  CreateSessionMutation,
  PostMessageOptions,
  SendMessageMutation,
} from '@/modules/chat/types/types';
import { invalidateAfterSend } from '@/modules/chat/streaming/invalidations';
import { wakeWorker } from '@/shared/utils/wakeWorker';
import { resources } from '@/resources';

// The send checks the allowance, so a capped Guest would otherwise leave an empty Session behind.
export const createChatSession = async (
  queryClient: QueryClient,
  createSession: CreateSessionMutation,
  content: string,
  mode: SendMessageBodyMode,
): Promise<string> => {
  const allowance = await queryClient.fetchQuery({
    ...getGetMessageAllowanceQueryOptions(),
    staleTime: 0,
  });
  if (allowance.metered && allowance.remaining === 0) {
    throw new AppError(ErrorCode.MessageAllowanceReached, resources.chat.streamError);
  }
  const created = await createSession({
    data: { title: content.slice(0, 50), replyMode: mode },
  });
  return created.id;
};

// Send, then subscribe (ADR-0014): the accepted send names the reply's stream, and its Run when it starts one.
export const postMessage = async (
  queryClient: QueryClient,
  sendMessage: SendMessageMutation,
  { sessionId, content, mode, model }: PostMessageOptions,
) => {
  // A tab left open past the worker's idle sleep: only a browser's ping gets through the edge.
  wakeWorker();
  const sent = await sendMessage({ sessionId, data: { content, mode, model } });
  invalidateAfterSend(queryClient, sessionId);
  return sent;
};
