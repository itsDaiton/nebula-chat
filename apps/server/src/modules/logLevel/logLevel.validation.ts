import { z } from 'zod';
import { LOG_COMPONENTS, LOG_LEVELS, MAX_LOG_LEVEL_TTL_SECONDS } from '@nebula-chat/otel';
import { isoDateTimeSchema } from '@backend/utils/isoDateTimeSchema';

/** Long enough to catch a problem in the act, short enough that a forgotten `trace` is cheap. */
const DEFAULT_TTL_SECONDS = 15 * 60;

export const changeLogLevelSchema = z.object({
  // exactOptional: absent, never `undefined`, as `LogLevelChange.component` expects.
  component: z
    .enum(LOG_COMPONENTS)
    .exactOptional()
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

export const logLevelChangeResponseSchema = z
  .object({
    receivers: z.int().describe('How many server instances received the change'),
    expiresAt: isoDateTimeSchema.describe('When the change reverts'),
  })
  .meta({ id: 'LogLevelChange' });

const logLevelStateSchema = z
  .object({
    target: z
      .enum(['root', ...LOG_COMPONENTS])
      .describe('The root level, or the `nebula.component` this level applies to'),
    level: z.enum([...LOG_LEVELS, 'silent']),
    expiresAt: z.iso
      .datetime()
      .nullable()
      .describe('When the runtime change reverts; `null` at the boot-time level'),
    operator: z
      .string()
      .nullable()
      .describe('Who asked for the runtime change; `null` at the boot-time level'),
  })
  .meta({ id: 'LogLevelState' });

const logLevelReportSchema = z
  .object({
    instance: z.string().describe('The server instance, as its hostname and process id'),
    levels: z
      .array(logLevelStateSchema)
      .max(LOG_COMPONENTS.length + 1)
      .describe('The root level, then every component'),
  })
  .meta({ id: 'LogLevelReport' });

export const logLevelReportsResponseSchema = z
  .object({
    receivers: z
      .int()
      .describe(
        'How many server instances received the request; more than reports means some did not answer in time',
      ),
    // A bound for the spec (checkov CKV_OPENAPI_21), far above any instance count we run.
    reports: z
      .array(logLevelReportSchema)
      .max(100)
      .describe('One per instance that answered, by instance'),
  })
  .meta({ id: 'LogLevelReports' });
