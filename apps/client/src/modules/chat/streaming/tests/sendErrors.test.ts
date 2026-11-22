import { describe, expect, it } from 'vitest';
import { AppError } from '@nebula-chat/errors';
import { ErrorCode } from '@/libs/api/generated/model/errorCode';
import { CreateSessionBodyReplyMode } from '@/libs/api/generated/model/createSessionBodyReplyMode';
import {
  allowanceRefusalOf,
  replyErrorMessage,
  sendFailureOf,
} from '@/modules/chat/streaming/sendErrors';
import { resources } from '@/resources';

describe('sendFailureOf', () => {
  it('names a send refused at the message allowance, in either mode', () => {
    const refused = new AppError(ErrorCode.MessageAllowanceReached, 'Out of messages');

    expect(sendFailureOf(refused, CreateSessionBodyReplyMode.direct)).toBe('allowance-reached');
    expect(sendFailureOf(refused, CreateSessionBodyReplyMode.run)).toBe('allowance-reached');
  });

  it('names a send refused at the spend allowance, in either mode', () => {
    const refused = new AppError(ErrorCode.SpendAllowanceReached, 'Resets on 2026-12-01');

    expect(sendFailureOf(refused, CreateSessionBodyReplyMode.direct)).toBe(
      'spend-allowance-reached',
    );
    expect(sendFailureOf(refused, CreateSessionBodyReplyMode.run)).toBe('spend-allowance-reached');
  });

  it('names a Run send that is forbidden, but not a Direct one', () => {
    const forbidden = new AppError(ErrorCode.Forbidden, 'Runs are for Registered users');

    expect(sendFailureOf(forbidden, CreateSessionBodyReplyMode.run)).toBe('run-forbidden');
    expect(sendFailureOf(forbidden, CreateSessionBodyReplyMode.direct)).toBe('failed');
  });

  it('calls anything else a failed reply', () => {
    expect(sendFailureOf(new Error('Network down'), CreateSessionBodyReplyMode.run)).toBe('failed');
  });
});

describe('replyErrorMessage', () => {
  it("shows the error's own message", () => {
    expect(replyErrorMessage(new Error('Network down'))).toBe('Network down');
  });

  it('falls back to the generic message for an empty or unknown error', () => {
    expect(replyErrorMessage(new Error(''))).toBe(resources.chat.streamError);
    expect(replyErrorMessage('boom')).toBe(resources.chat.streamError);
  });
});

describe('allowanceRefusalOf', () => {
  it.each([
    ['allowance-reached', { isMessageAllowanceReached: true }],
    ['spend-allowance-reached', { isSpendAllowanceReached: true }],
  ] as const)('flags %s in the store so the wall shows', (failure, state) => {
    expect(allowanceRefusalOf(failure)?.state).toEqual(state);
  });

  it('leaves other failures to the generic handling', () => {
    expect(allowanceRefusalOf('failed')).toBeUndefined();
    expect(allowanceRefusalOf('run-forbidden')).toBeUndefined();
  });
});
