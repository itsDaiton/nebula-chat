import { isAppError } from '@nebula-chat/errors';
import { ErrorCode } from '@/libs/api/generated/model/errorCode';
import { SendMessageBodyMode } from '@/libs/api/generated/model/sendMessageBodyMode';
import type { SendFailure } from '@/modules/chat/types/types';
import { resources } from '@/resources';

export const replyErrorMessage = (err: unknown): string =>
  err instanceof Error && err.message ? err.message : resources.chat.streamError;

// Nothing is persisted for a send refused at the allowance or a forbidden Run, so both hand the message back.
export const sendFailureOf = (err: unknown, mode: SendMessageBodyMode): SendFailure => {
  if (!isAppError(err)) return 'failed';
  if (err.code === ErrorCode.MessageAllowanceReached) return 'allowance-reached';
  if (err.code === ErrorCode.SpendAllowanceReached) return 'spend-allowance-reached';
  return mode === SendMessageBodyMode.run && err.code === ErrorCode.Forbidden
    ? 'run-forbidden'
    : 'failed';
};
