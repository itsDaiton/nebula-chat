import { errorEnvelopeSchema } from '@nebula-chat/errors';

// The shared envelope (ADR-0011), registered under one id so the OpenAPI
// document declares it once as a component and every route's error responses
// reference it, rather than inlining the whole union per status code.
export const errorResponseSchema = errorEnvelopeSchema.meta({ id: 'ErrorEnvelope' });
