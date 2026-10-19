import { AuthError, CliError, UsageError } from '@cli/errors';

const envelopeMessage = (data: unknown) =>
  typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string'
    ? data.message
    : undefined;

/** The error to exit with for a response the command did not expect to succeed with. */
export const responseError = ({ status, data }: { status: number; data: unknown }): CliError => {
  const message = envelopeMessage(data);
  const detail = `The server answered ${status}${message === undefined ? '' : `: ${message}`}`;
  if (status === 400) return new UsageError(detail);
  if (status === 401 || status === 403) return new AuthError(detail);
  return new CliError(detail);
};
