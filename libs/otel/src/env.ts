import { z } from 'zod';
import { LOG_LEVELS } from './logLevels';
import type { LogLevel } from './logLevels';

// An override may also mute a component outright.
const OVERRIDE_LEVELS: readonly string[] = [...LOG_LEVELS, 'silent'];

// Pino's `LevelWithSilent`, spelled in this package's own types: an app's inferred env type must
// not name pino, which the app may not depend on.
type OverrideLevel = LogLevel | 'silent';

const isOverrideLevel = (value: string): value is OverrideLevel => OVERRIDE_LEVELS.includes(value);

/**
 * `LOG_LEVEL_OVERRIDES`: comma-separated `component=level` pairs, e.g.
 * `redis=debug,auth=warn`, raising or lowering one `nebula.component` without
 * touching the rest. Component names are free-form (a name no logger uses is
 * inert); an unknown level fails env parsing at boot. Unset means no overrides.
 */
export const logLevelOverridesSchema = z
  .string()
  .optional()
  .transform((raw, ctx): Readonly<Record<string, OverrideLevel>> => {
    const overrides: Record<string, OverrideLevel> = {};
    for (const entry of (raw ?? '').split(',')) {
      if (entry.trim() === '') continue;
      const parts = entry.split('=').map((part) => part.trim());
      const [component = '', level = ''] = parts;
      if (parts.length !== 2 || component === '' || !isOverrideLevel(level)) {
        ctx.addIssue({
          code: 'custom',
          message: `Invalid LOG_LEVEL_OVERRIDES entry "${entry.trim()}": expected component=level with level one of ${OVERRIDE_LEVELS.join(', ')}`,
        });
        return z.NEVER;
      }
      overrides[component] = level;
    }
    return overrides;
  });

// The OTLP/HTTP exporters need a scheme; a bare `localhost:4318` parses as one called `localhost:`.
const otlpEndpointSchema = z.url({ protocol: /^https?$/ });

/**
 * The logging and telemetry variables every app reads, spread into its own env
 * schema so they validate at boot the same way in each.
 */
export const telemetryEnvShape = {
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
  LOG_LEVEL_OVERRIDES: logLevelOverridesSchema,
  OTEL_EXPORTER_OTLP_ENDPOINT: otlpEndpointSchema.optional(),
  // Log export over OTLP is opt-in (ADR-0023): `otlp` plus an endpoint, this one or the shared one.
  OTEL_LOGS_EXPORTER: z.enum(['otlp', 'none']).optional(),
  OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: otlpEndpointSchema.optional(),
  OTEL_LOG_LEVEL: z
    .enum(['none', 'error', 'warn', 'info', 'debug', 'verbose', 'all'])
    .default('error'),
};
