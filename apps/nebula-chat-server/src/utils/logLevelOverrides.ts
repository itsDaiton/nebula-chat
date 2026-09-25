import type { LevelOverrides } from '@nebula-chat/otel';
import { z } from 'zod';

/** The levels `LOG_LEVEL` accepts. */
export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;

// An override may also mute a component outright.
const OVERRIDE_LEVELS: readonly string[] = [...LOG_LEVELS, 'silent'];

type OverrideLevel = LevelOverrides[string];

const isOverrideLevel = (value: string): value is OverrideLevel => OVERRIDE_LEVELS.includes(value);

/**
 * `LOG_LEVEL_OVERRIDES`: comma-separated `component=level` pairs, e.g.
 * `redis=debug,auth=warn`, raising or lowering one `nebula.component` without
 * touching the rest. Component names are free-form (a name no logger uses is
 * inert); an unknown level fails env parsing at boot.
 */
export const logLevelOverridesSchema = z
  .string()
  .optional()
  .transform((raw, ctx): LevelOverrides | undefined => {
    if (raw === undefined) {
      return undefined;
    }
    const overrides: Record<string, OverrideLevel> = {};
    for (const entry of raw.split(',')) {
      if (entry.trim() === '') {
        continue;
      }
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
