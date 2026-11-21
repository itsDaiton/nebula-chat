import { describe, expect, it } from 'vitest';
import { AppError } from '@nebula-chat/errors';
import { ErrorCode } from '@/libs/api/generated/model/errorCode';
import { SendMessageBodyMode } from '@/libs/api/generated/model/sendMessageBodyMode';
import { replyErrorMessage, sendFailureOf } from '@/modules/chat/streaming/sendErrors';
import { resources } from '@/resources';

describe('sendFailureOf', () => {
  it('names a send refused at the message allowance, in either mode', () => {
    const refused = new AppError(ErrorCode.MessageAllowanceReached, 'Out of messages');

    expect(sendFailureOf(refused, SendMessageBodyMode.direct)).toBe('allowance-reached');
    expect(sendFailureOf(refused, SendMessageBodyMode.run)).toBe('allowance-reached');
  });

  it('names a send refused at the spend allowance, in either mode', () => {
    const refused = new AppError(ErrorCode.SpendAllowanceReached, 'Resets on 2026-12-01');

    expect(sendFailureOf(refused, SendMessageBodyMode.direct)).toBe('spend-allowance-reached');
    expect(sendFailureOf(refused, SendMessageBodyMode.run)).toBe('spend-allowance-reached');
  });

  it('names a Run send that is forbidden, but not a Direct one', () => {
    const forbidden = new AppError(ErrorCode.Forbidden, 'Runs are for Registered users');

    expect(sendFailureOf(forbidden, SendMessageBodyMode.run)).toBe('run-forbidden');
    expect(sendFailureOf(forbidden, SendMessageBodyMode.direct)).toBe('failed');
  });

  it('calls anything else a failed reply', () => {
    expect(sendFailureOf(new Error('Network down'), SendMessageBodyMode.run)).toBe('failed');
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
