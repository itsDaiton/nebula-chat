import type { HighlightedTextProps } from '@/modules/commandPalette/types/types';

/** The text with each case-insensitive occurrence of the query set in bold. */
export const HighlightedText = ({ text, query }: HighlightedTextProps) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return text;

  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let from = 0;
  for (let at = lower.indexOf(needle); at !== -1; at = lower.indexOf(needle, from)) {
    if (at > from) parts.push(text.slice(from, at));
    parts.push(
      <mark key={at} className="bg-transparent font-semibold text-foreground">
        {text.slice(at, at + needle.length)}
      </mark>,
    );
    from = at + needle.length;
  }
  parts.push(text.slice(from));
  return parts;
};
