import { z } from 'zod';

// The on-wire error contract shared by the server (JSON error handler and the
// chat SSE `error` event) and the client (ADR-0011). Each part has a metadata
// `id`, which becomes its name in the OpenAPI document and so in the generated
// client types.

export const errorCodeSchema = z
  .enum([
    'BadRequest',
    'Validation',
    'Unauthorized',
    'Forbidden',
    // A Guest has spent their message allowance and must register to continue.
    'MessageAllowanceReached',
    'NotFound',
    'Conflict',
    'PayloadTooLarge',
    'TooManyRequests',
    // The escape hatch: anything the server did not classify.
    'Internal',
  ])
  .meta({ id: 'ErrorCode' });

export const errorEnvelopeSchema = z
  .object({
    success: z.literal(false),
    error: errorCodeSchema,
    message: z.string(),
  })
  .meta({ id: 'ErrorEnvelope' });

export type ErrorCode = z.infer<typeof errorCodeSchema>;

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

/** What the client is told about any error that is not its own fault. */
export const GENERIC_ERROR_MESSAGE = 'An internal server error occurred';

export const INTERNAL_ERROR_ENVELOPE: ErrorEnvelope = Object.freeze({
  success: false,
  error: 'Internal',
  message: GENERIC_ERROR_MESSAGE,
});

export const isErrorEnvelope = (value: unknown): value is ErrorEnvelope =>
  errorEnvelopeSchema.safeParse(value).success;

/** The envelope `value` holds, or `null` when it is not one. */
export const parseErrorEnvelope = (value: unknown): ErrorEnvelope | null => {
  const result = errorEnvelopeSchema.safeParse(value);
  return result.success ? result.data : null;
};
