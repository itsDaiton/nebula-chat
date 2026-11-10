import { useParams } from '@tanstack/react-router';
import { ContextRing, levelColor } from '@/modules/chat/components/ContextRing';
import { useContextUsage } from '@/modules/chat/hooks/useContextUsage';
import { formatContextWindow } from '@/modules/chat/utils/formatContextWindow';
import { resources } from '@/resources';
import { ProviderLogo } from '@/shared/components/ProviderLogo';
import { Button } from '@/shared/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { cn } from '@/shared/utils/cn';

const { contextUsage: text } = resources.chat;

export const ContextUsagePopover = () => {
  const { id: sessionId } = useParams({ strict: false });
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
        align="center"
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
          <p className={cn('text-xl font-medium', levelColor[level])}>{percent}%</p>
        </div>
        <div className="mt-3.5 flex items-baseline justify-between gap-3 text-[12.5px]">
          <span className="text-foreground-secondary">{text.sent}</span>
          <span className="font-mono text-foreground-secondary">
            {text.sentValue(used, budget)}
          </span>
        </div>
        <div
          aria-hidden="true"
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-border-strong"
        >
          <div
            className={cn('h-full rounded-full bg-current', levelColor[level])}
            style={{ width: `${share * 100}%` }}
          />
        </div>
        <dl className="mt-3.5 flex flex-col gap-2 text-[12.5px]">
          {[
            [text.included, text.includedValue(messagesIncluded, messagesTotal)],
            [text.reserved, tokens(model.maxOutput)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-mono text-foreground-secondary">{value}</dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
};
