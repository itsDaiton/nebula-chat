import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { AppError } from '@nebula-chat/errors';
import { describe, expect, it } from 'vitest';
import { toAppError } from '@/libs/api/utils/toAppError';
import { resources } from '@/resources';

const aFailedResponse = (status: number, data: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse);

describe('toAppError', () => {
  it('keeps the code and message of an error envelope', () => {
    const error = toAppError(
      aFailedResponse(404, {
        success: false,
        error: 'NotFound',
        message: 'Conversation not found',
      }),
    );

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      code: 'NotFound',
      status: 404,
      message: 'Conversation not found',
    });
  });

  it('classifies a body that is not an envelope by its status, with a generic message', () => {
    expect(toAppError(aFailedResponse(401, { message: 'nope' }))).toMatchObject({
      code: 'Unauthorized',
      message: resources.errors.requestFailed,
    });
  });

  it('reads an unreachable server as Internal', () => {
    const error = toAppError(new AxiosError('Network Error', 'ERR_NETWORK'));

    expect(error).toMatchObject({ code: 'Internal', message: resources.errors.network });
  });

  it('keeps the axios error as its cause', () => {
    const axiosError = aFailedResponse(500, null);

    expect(toAppError(axiosError).cause).toBe(axiosError);
  });
});
