import { WorkflowIcon } from 'lucide-react';
import type { UsageRankedRowProps } from '@/modules/admin/types/types';
import { formatPercent } from '@/modules/admin/utils/usageFormat';
import { resources } from '@/resources';
import { ProviderLogo } from '@/shared/components/ProviderLogo';
import { ShareBar } from '@/shared/components/charts/ShareBar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { cn } from '@/shared/utils/cn';

const text = resources.admin.usage;
const focusRing = 'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none';

/** One Model in the ranked list: its value on the hovered day, its share, and a bar. Clicking pins it. */
export const UsageRankedRow = ({
  row,
  highlighted,
  pinned,
  formatValue,
  onPin,
}: UsageRankedRowProps) => {
  const pinnable = row.kind === 'model';
  const content = (
    <>
      <span className="flex items-center gap-2 text-[13px]">
        {row.provider && <ProviderLogo provider={row.provider} className="size-3.5" />}
        {row.kind === 'run' && <WorkflowIcon className="size-3.5 text-muted-foreground" />}
        <span className="grow truncate text-left">{row.label}</span>
        <span className="font-mono text-[12.5px] tabular-nums">{formatValue(row.value)}</span>
        <span className="w-12 text-right font-mono text-[11.5px] text-faint tabular-nums">
          {formatPercent(row.share * 100)}
        </span>
      </span>
      <ShareBar share={row.share} active={highlighted} />
    </>
  );
  const className = cn(
    'flex w-full flex-col gap-1.5 rounded-lg px-2.5 py-2',
    highlighted && 'bg-hover',
  );

  return pinnable ? (
    <button
      type="button"
      aria-pressed={pinned}
      aria-label={pinned ? text.unpin(row.label) : text.pin(row.label)}
      onClick={() => onPin(row.key)}
      className={cn(className, 'hover:bg-hover', focusRing)}
    >
      {content}
    </button>
  ) : (
    <Tooltip>
      <TooltipTrigger
        render={<button type="button" aria-disabled className={cn(className, focusRing)} />}
      >
        {content}
      </TooltipTrigger>
      <TooltipContent side="left">
        {row.kind === 'run' ? text.runTooltip : text.otherTooltip}
      </TooltipContent>
    </Tooltip>
  );
};
