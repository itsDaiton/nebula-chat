import { GetAdminLogLevelsService } from '@/libs/api/generated/model/getAdminLogLevelsService';
import { LogLevelStateTarget } from '@/libs/api/generated/model/logLevelStateTarget';
import type { LogLevelState } from '@/libs/api/generated/model/logLevelState';
import type { LogLevelReports } from '@/libs/api/generated/model/logLevelReports';
import type { LogLevelChoice, LogLevelRow, LogLevelTtl } from '@/modules/admin/types/types';

export const LOG_LEVEL_SERVICES = Object.values(GetAdminLogLevelsService);

export const LOG_LEVEL_TARGETS = Object.values(LogLevelStateTarget);

// `fatal` is left out: it would hide nearly everything, which no one debugs with.
export const LOG_LEVEL_CHOICES: LogLevelChoice[] = ['error', 'warn', 'info', 'debug', 'trace'];

export const LOG_LEVEL_TTLS: LogLevelTtl[] = [300, 900, 3600, 14400];

/** Identifies one distinct level state, so instances that agree share it. */
export const logLevelRowKey = ({ target, level, expiresAt, operator }: LogLevelState) =>
  [target, level, expiresAt, operator].join('|');

/** The request body's target: a component, or nothing for the root. */
export const componentOf = (target: LogLevelState['target']) =>
  target === 'root' ? {} : { component: target };

// A change lands on every instance shortly after its expiry; refreshing at the instant still shows it.
const REVERT_SETTLE_MS = 250;

// The "in Xm" countdown is in minutes, so a minute is the coarsest refresh that keeps it right.
const COUNTDOWN_REFRESH_MS = 60_000;

/** When to read a service's levels again: just after its earliest temporary change expires, at most a minute away; never while all are at boot. */
export const nextRefreshMs = (reports: LogLevelReports | undefined, now = Date.now()) => {
  const expiries = (reports?.reports ?? []).flatMap(({ levels }) =>
    levels.flatMap(({ expiresAt }) => (expiresAt === null ? [] : [Date.parse(expiresAt)])),
  );
  if (expiries.length === 0) return false;
  const untilEarliest = Math.max(0, Math.min(...expiries) - now) + REVERT_SETTLE_MS;
  return Math.min(untilEarliest, COUNTDOWN_REFRESH_MS);
};

/** Resolves once a change sent now has expired on every instance. */
export const untilExpired = (expiresAt: string) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, Math.max(0, Date.parse(expiresAt) - Date.now()) + REVERT_SETTLE_MS);
  });

/** The root and every temporary change, once each: instances that agree share a row, ones that differ get their own. */
export const logLevelRows = (
  service: GetAdminLogLevelsService,
  reports: LogLevelReports | undefined,
): LogLevelRow[] => {
  const rows = new Map<string, LogLevelRow>();
  for (const { levels } of reports?.reports ?? []) {
    for (const state of levels) {
      if (state.target !== 'root' && state.expiresAt === null) continue;
      const key = logLevelRowKey(state);
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
