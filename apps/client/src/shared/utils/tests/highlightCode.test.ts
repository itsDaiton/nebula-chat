import { describe, expect, it } from 'vitest';
import { highlightCode } from '@/shared/utils/highlightCode';

describe('highlightCode', () => {
  it('colours tokens with the theme variables, so one render serves light and dark', async () => {
    const html = await highlightCode('const x = 1;', 'typescript');

    expect(html).toContain('var(--shiki-token-keyword)');
    expect(html).not.toMatch(/color:#[0-9a-f]{3,6}/i);
  });

  it('shows a language outside the allow-list as plain text', async () => {
    const html = await highlightCode('some <code>', 'brainfuck');

    expect(html).toContain('some &#x3C;code>');
  });
});
