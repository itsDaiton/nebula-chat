import type { OverviewTileProps } from '@/modules/admin/types/types';
import { resources } from '@/resources';
import { Sparkline } from '@/shared/components/charts/Sparkline';
import { cn } from '@/shared/utils/cn';

const text = resources.admin.overview;
const arrows = { up: '▲', down: '▼', flat: '–' } as const;

export const OverviewTile = ({ label, range, value, delta, series }: OverviewTileProps) => (
  <div className="rounded-xl border border-border bg-panel px-3.5 pt-3.5 pb-2.5">
    <div className="flex justify-between text-xs text-muted-foreground">
      <span>{label}</span>
      <span className="font-mono text-[10.5px] text-faint">{range}</span>
    </div>
    <div className="mt-1.5 font-mono text-[26px] font-medium tracking-[-0.03em] tabular-nums">
      {value}
    </div>
    <div className="flex items-end justify-between">
      <div
        className={cn(
          'font-mono text-[11.5px]',
          delta?.direction === 'up' && 'text-success',
          delta?.direction === 'down' && 'text-destructive',
        )}
      >
        {delta ? `${arrows[delta.direction]} ${delta.text}` : '—'}{' '}
        <span className="text-faint">{text.vsPrevious}</span>
      </div>
      <Sparkline values={series} label={text.trend(label)} />
    </div>
  </div>
);
