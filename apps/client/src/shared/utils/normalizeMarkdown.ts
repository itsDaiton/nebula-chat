const OPEN_OUTER = /^```(?:markdown|md)[ \t]*$/;
const FENCE_LINE = /^\s*```/;

// Older models wrap the whole reply in ```markdown; nested fences then close it early and garble the rest.
const unwrapOuterFence = (content: string): string => {
  const lines = content.trim().split('\n');
  if (!OPEN_OUTER.test(lines[0] ?? '')) return content;
  const body = lines.slice(1);
  // An odd count ending in ``` means that last ``` closes the outer fence; otherwise it is still streaming.
  const fences = body.filter((line) => FENCE_LINE.test(line)).length;
  const endsFenced = body[body.length - 1]?.trim() === '```';
  if (fences === 0 || (fences === 1 && endsFenced)) return content;
  return (fences % 2 === 1 && endsFenced ? body.slice(0, -1) : body).join('\n');
};

// Raw HTML is dropped by the renderer, so <br> would show as text; a table row cannot hold a line break.
const fixLine = (line: string): string => {
  const withBullet = line.replace(/^(\s*)[•◦▪]\s+/, '$1- ');
  return withBullet.trimStart().startsWith('|')
    ? withBullet.replace(/\s*<br\s*\/?>\s*/gi, ' ')
    : withBullet.replace(/[ \t]*<br\s*\/?>[ \t]*/gi, '  \n');
};

/** Repairs the Markdown slips older models make; code blocks pass through untouched. */
export const normalizeMarkdown = (content: string): string => {
  let inFence = false;
  return unwrapOuterFence(content)
    .split('\n')
    .map((line) => {
      if (FENCE_LINE.test(line)) {
        inFence = !inFence;
        return line;
      }
      return inFence ? line : fixLine(line);
    })
    .join('\n');
};
