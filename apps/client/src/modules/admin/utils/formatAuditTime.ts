const compact = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const full = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** `27 Oct 21:02:11`, in the viewer's time zone. */
export const formatAuditTime = (iso: string) => compact.format(new Date(iso)).replace(',', '');

/** `27 Oct 2026, 21:02:11`, in the viewer's time zone. */
export const formatAuditTimeFull = (iso: string) => full.format(new Date(iso));
