import { z } from 'zod';
import { LOG_COMPONENTS, LOG_LEVELS, MAX_LOG_LEVEL_TTL_SECONDS } from '@nebula-chat/otel';
import { isoDateTimeSchema } from '@backend/utils/isoDateTimeSchema';

/** Long enough to catch a problem in the act, short enough that a forgotten `trace` is cheap. */
const DEFAULT_TTL_SECONDS = 15 * 60;

export const changeLogLevelSchema = z.object({
  component: z
    .enum(LOG_COMPONENTS)
    .optional()
    .describe('The `nebula.component` to change; omit it to change the root level'),
  level: z.enum(LOG_LEVELS),
  ttlSeconds: z
    .int()
    .min(1)
    .max(MAX_LOG_LEVEL_TTL_SECONDS)
    .default(DEFAULT_TTL_SECONDS)
    .describe('How long the change holds before the boot-time level returns'),
  operator: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .describe('Who is asking, recorded on the lines that log the change'),
});

// No `.meta({ id })`: the route is hidden from the spec, so there is no component to name.
export const logLevelChangeResponseSchema = z.object({
  receivers: z.int().describe('How many server instances received the change'),
  expiresAt: isoDateTimeSchema.describe('When the change reverts'),
});
