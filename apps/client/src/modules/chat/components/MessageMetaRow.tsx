import { CopyIcon, RefreshCwIcon } from 'lucide-react';
import { MetaSeparator } from '@/modules/chat/components/MetaSeparator';
import { getModelLabel } from '@/modules/chat/utils/modelOptions';
import type { MessageMetaRowProps } from '@/modules/chat/types/types';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import { useCopyToClipboard } from '@/shared/hooks/useCopyToClipboard';

const { meta } = resources.chat;

/** Copy, regenerate and how the answer was made; it shows on hover and while focus is inside. */
export const MessageMetaRow = ({ message, onRegenerate }: MessageMetaRowProps) => {
  const copy = useCopyToClipboard();
  const { runId, model, tokenCount, estimatedCostUsd } = message;
  const source = runId ? meta.run : model ? getModelLabel(model) : null;

  return (
    <div
      data-slot="message-meta-row"
      className="-ml-1.5 mt-0.5 flex h-[26px] items-center gap-0.5 text-[11.5px] text-faint opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100"
    >
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={meta.copy}
        onClick={() => void copy(message.content)}
      >
        <CopyIcon className="size-3.5" />
      </Button>
      {onRegenerate && (
        <Button variant="ghost" size="icon-xs" aria-label={meta.regenerate} onClick={onRegenerate}>
          <RefreshCwIcon className="size-3.5" />
        </Button>
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
