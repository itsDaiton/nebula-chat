import type { AxiosError } from 'axios';
import { AppError, errorCodeForStatus, parseErrorEnvelope } from '@nebula-chat/errors';
import { resources } from '@/resources';

/** A failed request as an AppError: the envelope if one was sent, else classified by status. */
export const toAppError = (error: AxiosError): AppError => {
  if (!error.response) {
    return new AppError('Internal', resources.errors.network, { cause: error });
  }
  const envelope = parseErrorEnvelope(error.response.data);
  if (envelope) {
    return new AppError(envelope.error, envelope.message, { cause: error });
  }
  return new AppError(errorCodeForStatus(error.response.status), resources.errors.requestFailed, {
    cause: error,
  });
};
