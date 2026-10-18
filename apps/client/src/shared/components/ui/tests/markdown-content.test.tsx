import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownContent } from '@/shared/components/ui/markdown-content';
import { renderWithChakra } from '@/test/render';

vi.mock('@/theme/hooks/useColorMode', () => ({
  useColorMode: () => ({ colorMode: 'light', toggleColorMode: vi.fn() }),
}));

describe('MarkdownContent', () => {
  it('renders plain prose', () => {
    renderWithChakra(<MarkdownContent content="Just some text." />);

    expect(screen.getByText('Just some text.')).toBeInTheDocument();
  });

  it('renders headings as heading elements', () => {
    renderWithChakra(<MarkdownContent content="# Title" />);

    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
  });

  it('renders list items', () => {
    renderWithChakra(<MarkdownContent content={'- one\n- two'} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('renders a GitHub-flavoured table', () => {
    renderWithChakra(<MarkdownContent content={'| a | b |\n| --- | --- |\n| 1 | 2 |'} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders a fenced code block', () => {
    const { container } = renderWithChakra(
      <MarkdownContent content={'```typescript\nconst x = 1;\n```'} />,
    );

    expect(container.textContent).toContain('const x = 1;');
  });

  it('renders inline code', () => {
    const { container } = renderWithChakra(<MarkdownContent content="use `npm install` here" />);

    expect(container.querySelector('code')?.textContent).toBe('npm install');
  });

  it('keeps a safe link clickable', () => {
    renderWithChakra(<MarkdownContent content="[docs](https://example.com)" />);

    expect(screen.getByRole('link', { name: 'docs' })).toHaveAttribute(
      'href',
      'https://example.com',
    );
  });

  it('strips the href from a javascript: link, so it cannot execute', () => {
    renderWithChakra(<MarkdownContent content="[click](javascript:alert(1))" />);

    const link = screen.queryByRole('link', { name: 'click' });
    expect(link?.getAttribute('href') ?? '').not.toContain('javascript:');
  });

  it('renders an empty string without crashing', () => {
    expect(() => renderWithChakra(<MarkdownContent content="" />)).not.toThrow();
  });
});
