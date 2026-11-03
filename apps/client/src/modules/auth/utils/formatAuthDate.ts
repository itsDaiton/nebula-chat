const formatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** "26 November 2026" */
export const formatAuthDate = (isoDate: string) => formatter.format(new Date(isoDate));
