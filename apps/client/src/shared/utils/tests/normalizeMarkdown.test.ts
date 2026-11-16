import { describe, expect, it } from 'vitest';
import { normalizeMarkdown } from '@/shared/utils/normalizeMarkdown';

describe('normalizeMarkdown', () => {
  it('leaves well-formed Markdown untouched', () => {
    const md = '# Title\n\n- a\n- b\n\n```ts\nconst x = 1;\n```';

    expect(normalizeMarkdown(md)).toBe(md);
  });

  it('unwraps a reply wrapped whole in a markdown fence that holds nested fences', () => {
    const md = '```markdown\n# Title\n\n```python\nprint(1)\n```\n```';

    expect(normalizeMarkdown(md)).toBe('# Title\n\n```python\nprint(1)\n```');
  });

  it('unwraps the opening fence while the closing one has not streamed yet', () => {
    const md = '```md\n# Title\n\n```python\nprint(1)\n```\n';

    expect(normalizeMarkdown(md)).toBe('# Title\n\n```python\nprint(1)\n```');
  });

  it('keeps a markdown fence that shows Markdown with no nested fence', () => {
    const md = '```markdown\n# Title\n\n- a\n```';

    expect(normalizeMarkdown(md)).toBe(md);
  });

  it('turns • bullets into list items', () => {
    expect(normalizeMarkdown('• one\n• two')).toBe('- one\n- two');
  });

  it('turns <br> into a hard break in prose and a space in a table row', () => {
    expect(normalizeMarkdown('a<br>b')).toBe('a  \nb');
    expect(normalizeMarkdown('| 1<br/>x | 2 |')).toBe('| 1 x | 2 |');
  });

  it('leaves code blocks alone', () => {
    const md = '```html\n<p>a<br>b</p>\n• not a bullet\n```';

    expect(normalizeMarkdown(md)).toBe(md);
  });
});
