/** A short slice of the text around the query's first match, ellipsised where cut; the text itself when nothing matches. */
export const windowAround = (text: string, query: string, before = 24, after = 32) => {
  const needle = query.trim().toLowerCase();
  const at = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (at === -1) return text;

  const start = Math.max(0, at - before);
  const end = Math.min(text.length, at + needle.length + after);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
};
