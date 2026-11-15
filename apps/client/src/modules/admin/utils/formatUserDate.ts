const day = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' });

const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// en-GB abbreviates September to four letters, which breaks the three-letter column.
const shortMonth = (text: string) => text.replace('Sept', 'Sep');

/** `12 Mar`, in the viewer's time zone. */
export const formatUserDay = (iso: string) => shortMonth(day.format(new Date(iso)));

/** `21 Oct 2026`, in the viewer's time zone. */
export const formatUserDate = (iso: string) => shortMonth(date.format(new Date(iso)));
