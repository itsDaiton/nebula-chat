import { z } from 'zod';

// The on-wire error contract shared by the server (JSON error handler and the
// chat SSE `error` event) and the client (ADR-0011). A discriminated union on
// `error`: most codes carry only a message, and a code that carries `details`
// is its own member, so narrowing on the code guarantees the details.
//
// Each part has a metadata `id`, which becomes its name in the OpenAPI document
// and so in the generated client types.

/** Codes that carry only a message. */
export const generalErrorCodeSchema = z
  .enum([
    'BadRequest',
    'Validation',
    'Unauthorized',
    'Forbidden',
    'NotFound',
    'Conflict',
    'PayloadTooLarge',
    'TooManyRequests',
    // The escape hatch: anything the server did not classify.
    'Internal',
  ])
  .meta({ id: 'GeneralErrorCode' });

/** How much of the Guest message allowance is spent. */
export const messageAllowanceDetailsSchema = z
  .object({
    limit: z.number().int().nonnegative(),
    count: z.number().int().nonnegative(),
  })
  .meta({ id: 'MessageAllowanceDetails' });

export const errorEnvelopeSchema = z
  .discriminatedUnion('error', [
    z.object({
      success: z.literal(false),
      error: generalErrorCodeSchema,
      message: z.string(),
    }),
    z.object({
      success: z.literal(false),
      error: z.literal('MessageAllowanceReached'),
      message: z.string(),
      details: messageAllowanceDetailsSchema,
    }),
  ])
  .meta({ id: 'ErrorEnvelope' });

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

export type ErrorCode = ErrorEnvelope['error'];

export type GeneralErrorCode = z.infer<typeof generalErrorCodeSchema>;

export type MessageAllowanceDetails = z.infer<typeof messageAllowanceDetailsSchema>;

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
