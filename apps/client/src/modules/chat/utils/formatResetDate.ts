/** The UTC calendar day an allowance resets, e.g. "Dec 1"; the server counts months in UTC. */
export const formatResetDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
