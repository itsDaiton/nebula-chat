import { isAppError } from '@nebula-chat/errors';
import { ErrorCode } from '@/libs/api/generated/model/errorCode';
import { SendMessageBodyMode } from '@/libs/api/generated/model/sendMessageBodyMode';
import type { QueryClient } from '@tanstack/react-query';
import {
  invalidateMessageAllowance,
  invalidateSpendAllowance,
} from '@/modules/chat/streaming/invalidations';
import type { ChatStreamState, SendFailure } from '@/modules/chat/types/types';
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

type AllowanceRefusal = {
  state: Partial<ChatStreamState>;
  invalidate: (queryClient: QueryClient) => void;
};

// A send refused at an allowance goes back to the composer and refreshes that allowance's read.
const ALLOWANCE_REFUSALS: Partial<Record<SendFailure, AllowanceRefusal>> = {
  'allowance-reached': {
    state: { isMessageAllowanceReached: true },
    invalidate: invalidateMessageAllowance,
  },
  'spend-allowance-reached': {
    state: { isSpendAllowanceReached: true },
    invalidate: invalidateSpendAllowance,
  },
};

export const allowanceRefusalOf = (failure: SendFailure): AllowanceRefusal | undefined =>
  ALLOWANCE_REFUSALS[failure];
