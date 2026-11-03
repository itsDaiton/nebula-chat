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
