import { z } from 'zod';

// The on-wire error contract shared by the server (JSON error handler and the
// chat SSE `error` event) and the client (ADR-0011). A discriminated union on
// `error`, so narrowing the code narrows `details`: most codes carry none, and
// a code gains a typed `details` only once a concrete consumer needs it.

const envelopeBase = {
  success: z.literal(false),
  message: z.string(),
};

/** Why a Guest was refused another message: the allowance and how much of it is spent. */
export const messageAllowanceDetailsSchema = z.object({
  limit: z.number().int().nonnegative(),
  count: z.number().int().nonnegative(),
});

export const errorEnvelopeSchema = z.discriminatedUnion('error', [
  z.object({ ...envelopeBase, error: z.literal('BadRequest') }),
  z.object({ ...envelopeBase, error: z.literal('Validation') }),
  z.object({ ...envelopeBase, error: z.literal('Unauthorized') }),
  z.object({
    ...envelopeBase,
    error: z.literal('Forbidden'),
    // Present only when the refusal is the Guest message allowance.
    details: messageAllowanceDetailsSchema.optional(),
  }),
  z.object({ ...envelopeBase, error: z.literal('NotFound') }),
  z.object({ ...envelopeBase, error: z.literal('Conflict') }),
  z.object({ ...envelopeBase, error: z.literal('PayloadTooLarge') }),
  z.object({ ...envelopeBase, error: z.literal('TooManyRequests') }),
  // The escape hatch: anything the server did not classify.
  z.object({ ...envelopeBase, error: z.literal('Internal') }),
]);

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

export type ErrorCode = ErrorEnvelope['error'];

export type MessageAllowanceDetails = z.infer<typeof messageAllowanceDetailsSchema>;

type EnvelopeFor<C extends ErrorCode> = Extract<ErrorEnvelope, { error: C }>;

/** The `details` a code carries, or `never` for a code that carries none. */
export type ErrorDetails<C extends ErrorCode> = 'details' extends keyof EnvelopeFor<C>
  ? NonNullable<EnvelopeFor<C>['details']>
  : never;

export const isErrorEnvelope = (value: unknown): value is ErrorEnvelope =>
  errorEnvelopeSchema.safeParse(value).success;

/** The envelope `value` holds, or `null` when it is not one. */
export const parseErrorEnvelope = (value: unknown): ErrorEnvelope | null => {
  const result = errorEnvelopeSchema.safeParse(value);
  return result.success ? result.data : null;
};
