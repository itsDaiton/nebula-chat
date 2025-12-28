import { memo } from 'react';
import { CodeBlock, IconButton, Box } from '@chakra-ui/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prose } from './prose';
import { shikiAdapter } from './code-block-adapter';
import { useColorMode } from './color-mode';
import type { MarkdownContentProps } from '@/shared/types/types';

export const MarkdownContent = memo(({ content }: MarkdownContentProps) => {
  const { colorMode } = useColorMode();

  return (
    <CodeBlock.AdapterProvider value={shikiAdapter}>
      <Prose maxWidth="none">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            code(props) {
              const { className, children, ...rest } = props;
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : '';
              const codeString = String(children).replace(/\n$/, '');
              const isInline = !className;

              if (!isInline && language) {
                return (
                  <Box my={4}>
                    <CodeBlock.Root
                      code={codeString}
                      language={language}
                      size="md"
                      meta={{ showLineNumbers: true, colorScheme: colorMode }}
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
            },
            p({ children, node }) {
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
            },
            a({ href, children }) {
              return (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              );
            },
          }}
        >
          {content}
        </Markdown>
      </Prose>
    </CodeBlock.AdapterProvider>
  );
});

MarkdownContent.displayName = 'MarkdownContent';
