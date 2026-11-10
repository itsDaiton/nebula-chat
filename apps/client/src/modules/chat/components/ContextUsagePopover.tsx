import { InfoIcon, SquarePenIcon } from 'lucide-react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ContextRing } from '@/modules/chat/components/ContextRing';
import { useContextUsage } from '@/modules/chat/hooks/useContextUsage';
import type { ContextLevel } from '@/modules/chat/types/types';
import { formatContextWindow } from '@/modules/chat/utils/formatContextWindow';
import { resources } from '@/resources';
import { ProviderLogo } from '@/shared/components/ProviderLogo';
import { Button } from '@/shared/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { cn } from '@/shared/utils/cn';

const { contextUsage: text } = resources.chat;

const levelText: Record<ContextLevel, string> = {
  normal: 'text-muted-foreground',
  warning: 'text-warning',
  critical: 'text-destructive',
};
const levelFill: Record<ContextLevel, string> = {
  normal: 'bg-muted-foreground',
  warning: 'bg-warning',
  critical: 'bg-destructive',
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-3">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="font-mono text-foreground-secondary">{value}</dd>
  </div>
);

export const ContextUsagePopover = () => {
  const { id: sessionId } = useParams({ strict: false });
  const navigate = useNavigate();
  const usage = useContextUsage(sessionId);
  if (!usage) return null;

  const { model, used, budget, share, percent, level, messagesIncluded, messagesTotal } = usage;
  const { tokens } = resources.chat.meta;

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={text.label(percent)}
                  className="rounded-full"
                />
              }
            />
          }
        >
          <ContextRing share={share} level={level} />
        </TooltipTrigger>
        <TooltipContent>
          {text.tooltip(percent, formatContextWindow(used), formatContextWindow(budget))}
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        aria-label={text.title}
        className="w-85 max-w-[calc(100vw-2rem)] p-3.5"
      >
        <div className="flex items-center gap-3">
          <ContextRing share={share} level={level} size={38} strokeWidth={3.5} />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold">{text.title}</p>
            <p className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
              <ProviderLogo provider={model.provider} className="size-3" />
              {model.label}
            </p>
          </div>
          <p className={cn('text-xl font-medium', levelText[level])}>{percent}%</p>
        </div>
        <div className="mt-3.5 flex items-baseline justify-between gap-3 text-[12.5px]">
          <span className="text-foreground-secondary">{text.sent}</span>
          <span className="font-mono text-foreground-secondary">
            {used.toLocaleString('en-US')} / {budget.toLocaleString('en-US')}
          </span>
        </div>
        <div
          aria-hidden="true"
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-border-strong"
        >
          <div
            className={cn('h-full rounded-full', levelFill[level])}
            style={{ width: `${share * 100}%` }}
          />
        </div>
        <dl className="mt-3.5 flex flex-col gap-2 text-[12.5px]">
          <Row label={text.included} value={text.includedValue(messagesIncluded, messagesTotal)} />
          <Row label={text.reserved} value={tokens(model.maxOutput)} />
          <Row label={text.window} value={tokens(model.contextWindow)} />
        </dl>
        <div className="mt-3.5 flex gap-2.5 rounded-[10px] border border-border bg-raised p-3 text-[12.5px] text-foreground-secondary">
          <InfoIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <p>{text.note}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2.5 w-full"
          onClick={() => void navigate({ to: '/' })}
        >
          <SquarePenIcon />
          {text.newChat}
        </Button>
      </PopoverContent>
    </Popover>
  );
};
