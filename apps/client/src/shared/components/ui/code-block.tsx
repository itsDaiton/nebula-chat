import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import { useCopyToClipboard } from '@/shared/hooks/useCopyToClipboard';
import { highlightCode } from '@/shared/utils/highlightCode';

type CodeBlockProps = {
  code: string;
  language: string;
};

const CodeBlock = ({ code, language }: CodeBlockProps) => {
  const { copy, copied } = useCopyToClipboard();
  // Highlighting is async and pure, so it rides the query cache; the plain code shows until it lands.
  const { data: html } = useQuery({
    queryKey: ['highlight', language, code],
    queryFn: () => highlightCode(code, language),
    placeholderData: keepPreviousData,
    staleTime: Infinity,
    meta: { inlineError: true },
  });

  return (
    <div
      data-slot="code-block"
      className="code-block my-1 mb-3.5 overflow-hidden rounded-[10px] border border-border bg-canvas"
    >
      <div className="flex h-8 items-center justify-between border-b border-border bg-raised pr-1.5 pl-3 font-mono text-[11px] text-muted-foreground">
        <span>{language}</span>
        <Button
          variant="ghost"
          size="xs"
          className="text-[11.5px] text-muted-foreground"
          onClick={() => void copy(code)}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? resources.chat.meta.copied : resources.chat.code.copy}
        </Button>
      </div>
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre>
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
};

export { CodeBlock };
