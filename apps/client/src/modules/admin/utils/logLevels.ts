import { LogLevelStateTarget } from '@/libs/api/generated/model/logLevelStateTarget';
import type { LogLevelReports } from '@/libs/api/generated/model/logLevelReports';
import type {
  LogLevelChoice,
  LogLevelRow,
  LogLevelService,
  LogLevelTtl,
} from '@/modules/admin/types/types';

export const LOG_LEVEL_SERVICES: LogLevelService[] = ['server', 'worker'];

export const LOG_LEVEL_TARGETS = Object.values(LogLevelStateTarget);

// `fatal` is left out: it would hide nearly everything, which no one debugs with.
export const LOG_LEVEL_CHOICES: LogLevelChoice[] = ['error', 'warn', 'info', 'debug', 'trace'];

export const LOG_LEVEL_TTLS: LogLevelTtl[] = [300, 900, 3600, 14400];

/** The root and every temporary change, once each: instances that agree share a row, ones that differ get their own. */
export const logLevelRows = (
  service: LogLevelService,
  reports: LogLevelReports | undefined,
): LogLevelRow[] => {
  const rows = new Map<string, LogLevelRow>();
  for (const { levels } of reports?.reports ?? []) {
    for (const state of levels) {
      if (state.target !== 'root' && state.expiresAt === null) continue;
      const key = [state.target, state.level, state.expiresAt, state.operator].join('|');
      if (!rows.has(key)) rows.set(key, { service, ...state });
    }
  }
  return [...rows.values()].sort(
    (a, b) => LOG_LEVEL_TARGETS.indexOf(a.target) - LOG_LEVEL_TARGETS.indexOf(b.target),
  );
};

/** How long until `expiresAt`, as `11m` or `1h 5m`; never less than a minute. */
export const formatWait = (expiresAt: string, now = Date.now()) => {
  const minutes = Math.max(1, Math.round((Date.parse(expiresAt) - now) / 60_000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
};

export const formatClock = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
