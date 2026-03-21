import { memo } from 'react';
import { CodeBlock, IconButton, Box } from '@chakra-ui/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prose } from '@/shared/components/ui/prose';
import { useColorMode } from '@/theme/hooks/useColorMode';
import type { MarkdownContentProps } from '@/shared/types/types';
import { isSafeUrl } from '@/shared/utils/urlUtils';
import type { Components, ExtraProps } from 'react-markdown';
import type { HTMLAttributes, AnchorHTMLAttributes } from 'react';

type CodeProps = HTMLAttributes<HTMLElement> & ExtraProps;
type ParagraphProps = HTMLAttributes<HTMLParagraphElement> & ExtraProps;
type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & ExtraProps;

const MarkdownCode = ({ className, children, ...rest }: CodeProps) => {
  const { colorMode } = useColorMode();
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const toText = (node: unknown): string => {
    if (node === null || node === undefined) return '';
    if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean')
      return String(node);
    if (Array.isArray(node)) return node.map(toText).join('');
    return '';
  };
  const codeString = toText(children).replace(/\n$/, '');
  const isInline = !className;

  if (!isInline && language) {
    return (
      <Box my={4}>
        <CodeBlock.Root
          code={codeString}
          language={language}
          size="md"
          meta={{ colorScheme: colorMode }}
        >
          <CodeBlock.Header>
            <CodeBlock.Title>{language}</CodeBlock.Title>
            <CodeBlock.CopyTrigger asChild>
              <IconButton variant="ghost" size="xs">
                <CodeBlock.CopyIndicator />
              </IconButton>
            </CodeBlock.CopyTrigger>
          </CodeBlock.Header>
          <CodeBlock.Content bg="transparent">
            <CodeBlock.Code
              fontSize="sm"
              bg="transparent"
              css={{ '& pre': { background: 'transparent !important' } }}
            >
              <CodeBlock.CodeText />
            </CodeBlock.Code>
          </CodeBlock.Content>
        </CodeBlock.Root>
      </Box>
    );
  }
  return (
    <code className={className} {...rest}>
      {children}
    </code>
  );
};

const MarkdownParagraph = ({ children, node }: ParagraphProps) => {
  const isFirstChild = node?.position?.start.line === 1;
  const isOnlyChild = node?.position?.start.line === node?.position?.end.line;
  return (
    <p
      style={{
        marginTop: isFirstChild ? 0 : undefined,
        marginBottom: isOnlyChild ? 0 : undefined,
      }}
    >
      {children}
    </p>
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

const markdownComponents: Components = {
  code: MarkdownCode,
  p: MarkdownParagraph,
  a: MarkdownLink,
};

export const MarkdownContent = memo(({ content }: MarkdownContentProps) => (
  <Prose maxWidth="none">
    <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {content}
    </Markdown>
  </Prose>
));

MarkdownContent.displayName = 'MarkdownContent';
