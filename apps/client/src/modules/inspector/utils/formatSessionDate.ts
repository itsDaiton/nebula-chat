const formatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** "27 Oct, 18:02" */
export const formatSessionDate = (dateString: string) => formatter.format(new Date(dateString));
