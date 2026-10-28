import { isValidElement, memo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '@/shared/components/ui/code-block';
import type { MarkdownContentProps } from '@/shared/types/types';
import { isSafeUrl } from '@/shared/utils/urlUtils';
import type { Components, ExtraProps } from 'react-markdown';
import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

type PreProps = HTMLAttributes<HTMLPreElement> & ExtraProps;
type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & ExtraProps;
type CodeElementProps = { className?: string; children?: ReactNode };

const toText = (node: ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  return '';
};

// A fenced block arrives as <pre><code class="language-x">; inline code stays a plain <code>.
const MarkdownPre = ({ children }: PreProps) => {
  if (!isValidElement<CodeElementProps>(children)) return <pre>{children}</pre>;
  const language = /language-(\w+)/.exec(children.props.className ?? '')?.[1] ?? 'text';
  return (
    <CodeBlock code={toText(children.props.children).replace(/\n$/, '')} language={language} />
  );
};

const MarkdownLink = ({ href, children }: AnchorProps) => {
  const safeHref = isSafeUrl(href) ? href : undefined;

  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      style={safeHref ? undefined : { pointerEvents: 'none', opacity: 0.5 }}
    >
      {children}
    </a>
  );
};

const MarkdownTable = ({ children }: HTMLAttributes<HTMLTableElement> & ExtraProps) => (
  <div className="table-wrap">
    <table>{children}</table>
  </div>
);

const markdownComponents: Components = {
  pre: MarkdownPre,
  a: MarkdownLink,
  table: MarkdownTable,
};

export const MarkdownContent = memo(({ content }: MarkdownContentProps) => (
  <div className="chat-prose">
    <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {content}
    </Markdown>
  </div>
));

MarkdownContent.displayName = 'MarkdownContent';
