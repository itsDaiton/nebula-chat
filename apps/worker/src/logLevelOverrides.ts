import { z } from 'zod';
import { LOG_LEVELS } from '@nebula-chat/otel';
import type { LogLevel } from '@nebula-chat/otel';

// An override may also mute a component outright.
const OVERRIDE_LEVELS: readonly string[] = [...LOG_LEVELS, 'silent'];

// Spelled out rather than `LevelOverrides`, whose Pino level type this package cannot name.
type OverrideLevel = LogLevel | 'silent';

const isOverrideLevel = (value: string): value is OverrideLevel => OVERRIDE_LEVELS.includes(value);

/** `LOG_LEVEL_OVERRIDES`: comma-separated `component=level` pairs, as in the server (docs/logging.md). */
export const logLevelOverridesSchema = z
  .string()
  .optional()
  .transform((raw, ctx): Record<string, OverrideLevel> => {
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
