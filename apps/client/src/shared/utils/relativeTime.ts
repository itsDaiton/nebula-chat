const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** A compact age such as `2m`, `3h` or `1w`; Intl's narrow style can't produce these. */
export const formatRelativeTime = (dateString: string, now: number): string => {
  const elapsed = Math.max(0, now - new Date(dateString).getTime());
  const days = Math.floor(elapsed / DAY);

  if (elapsed < MINUTE) return 'now';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
};

const LONG_FORMAT = new Intl.RelativeTimeFormat('en', { numeric: 'always' });

/** A spelled-out age such as `3 months ago`, on the same thresholds as `formatRelativeTime`. */
export const formatLongRelativeTime = (dateString: string, now: number): string => {
  const elapsed = Math.max(0, now - new Date(dateString).getTime());
  const days = Math.floor(elapsed / DAY);

  if (elapsed < MINUTE) return 'just now';
  if (elapsed < HOUR) return LONG_FORMAT.format(-Math.floor(elapsed / MINUTE), 'minute');
  if (elapsed < DAY) return LONG_FORMAT.format(-Math.floor(elapsed / HOUR), 'hour');
  if (days < 7) return LONG_FORMAT.format(-days, 'day');
  if (days < 30) return LONG_FORMAT.format(-Math.floor(days / 7), 'week');
  if (days < 365) return LONG_FORMAT.format(-Math.floor(days / 30), 'month');
  return LONG_FORMAT.format(-Math.floor(days / 365), 'year');
};
