import { CheckIcon, CopyIcon, RefreshCwIcon } from 'lucide-react';
import { MetaSeparator } from '@/modules/chat/components/MetaSeparator';
import { getModelLabel } from '@/modules/chat/utils/modelOptions';
import type { ChatMessageProps } from '@/modules/chat/types/types';
import { resources } from '@/resources';
import { IconButton } from '@/shared/components/ui/icon-button';
import { useCopyToClipboard } from '@/shared/hooks/useCopyToClipboard';

const { meta } = resources.chat;

/** Copy, regenerate and how the answer was made; it shows on hover and while focus is inside. */
export const MessageMetaRow = ({ message, onRegenerate }: ChatMessageProps) => {
  const { copy, copied } = useCopyToClipboard();
  const { runId, model, tokenCount, estimatedCostUsd } = message;
  let source: string | null = null;
  if (runId) source = meta.run;
  else if (model) source = getModelLabel(model);

  return (
    <div
      data-slot="message-meta-row"
      className="-ml-1.5 mt-0.5 flex h-[26px] items-center gap-0.5 text-[11.5px] text-faint opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100"
    >
      <IconButton
        variant="ghost"
        size="icon-xs"
        label={meta.copy}
        onClick={() => void copy(message.content)}
      >
        {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
      </IconButton>
      {onRegenerate && (
        <IconButton variant="ghost" size="icon-xs" label={meta.regenerate} onClick={onRegenerate}>
          <RefreshCwIcon className="size-3.5" />
        </IconButton>
      )}
      {source && (
        <>
          <MetaSeparator />
          <span>{source}</span>
        </>
      )}
      {tokenCount != null && (
        <>
          <MetaSeparator />
          <span className="font-mono text-[11px] tabular-nums">{meta.tokens(tokenCount)}</span>
        </>
      )}
      {estimatedCostUsd != null && (
        <>
          <MetaSeparator />
          <span className="font-mono text-[11px] tabular-nums">{meta.cost(estimatedCostUsd)}</span>
        </>
      )}
    </div>
  );
};
