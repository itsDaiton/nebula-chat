import { usageTiles } from '@/modules/admin/utils/usageTiles';
import type { UsageTilesProps } from '@/modules/admin/types/types';
import { resources } from '@/resources';
import { cn } from '@/shared/utils/cn';

const text = resources.admin.usage;
const arrows = { up: '▲', down: '▼', flat: '–' } as const;

export const UsageTiles = ({ totals, tab }: UsageTilesProps) => (
  <div className="grid grid-cols-2 gap-2.5 px-5 pb-4 sm:grid-cols-3 xl:grid-cols-6">
    {(totals ? usageTiles(totals, tab) : []).map((tile) => (
      <div
        key={tile.id}
        role="group"
        aria-label={text.tiles[tile.id]}
        className="rounded-xl border border-border bg-panel px-3.5 py-3"
      >
        <div className="text-xs text-muted-foreground">{text.tiles[tile.id]}</div>
        <div className="mt-1.5 font-mono text-[22px] font-medium tracking-[-0.03em] tabular-nums">
          {tile.value}
        </div>
        <div
          className={cn(
            'font-mono text-[11.5px]',
            tile.delta?.direction === 'up' && 'text-success',
            tile.delta?.direction === 'down' && 'text-destructive',
          )}
        >
          {tile.delta ? `${arrows[tile.delta.direction]} ${tile.delta.text}` : '—'}{' '}
          <span className="text-faint">{text.vsPrevious}</span>
        </div>
      </div>
    ))}
  </div>
);
