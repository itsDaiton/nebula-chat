import { inspect } from 'node:util';
import pino from 'pino';

type SerializedNonError = { type: string; message: string };

/**
 * The `err` serializer: an Error goes through Pino's `errWithCause` (keeping `cause`); anything else thrown is still emitted as an object with `err.type` and `err.message`.
 */
export const serializeErr = (
  value: unknown,
): ReturnType<typeof pino.stdSerializers.errWithCause> | SerializedNonError => {
  if (value instanceof Error) {
    return pino.stdSerializers.errWithCause(value);
  }
  return {
    type: typeof value,
    message: typeof value === 'string' ? value : inspect(value),
  };
};
