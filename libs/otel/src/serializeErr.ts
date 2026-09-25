import { inspect } from 'node:util';
import pino from 'pino';

type SerializedNonError = { type: string; message: string };

/**
 * The `err` serializer. An Error goes through Pino's `errWithCause`, which
 * keeps `cause` as a nested serialized error — so a mapped Postgres error still
 * shows the driver error beneath it. Anything else that was thrown (a string, a
 * plain object) is still emitted as an object, so `err.type` and `err.message`
 * are always there to query.
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
