import { UsageChartCard } from '@/modules/admin/components/UsageChartCard';
import { UsageDataFootnote } from '@/modules/admin/components/UsageDataFootnote';
import { UsageRankedList } from '@/modules/admin/components/UsageRankedList';
import { UsageTable } from '@/modules/admin/components/UsageTable';
import { useUsageSeries } from '@/modules/admin/hooks/useUsageSeries';
import { useUsageHoverStore } from '@/modules/admin/stores/useUsageHoverStore';
import { useUsageTableStore } from '@/modules/admin/stores/useUsageTableStore';
import type { UsageModelsViewProps } from '@/modules/admin/types/types';
import { highlightedKey, rankRows } from '@/modules/admin/utils/usageData';
import { formatDay, formatSeriesValue } from '@/modules/admin/utils/usageFormat';
import { useModelCatalog } from '@/modules/chat/hooks/useModelCatalog';
import { resources } from '@/resources';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { cn } from '@/shared/utils/cn';

const text = resources.admin.usage;

/** The Prompts, Tokens and Est. spend tabs: per-Model series, ranked list and chart. */
export const UsageModelsView = ({ params, onPin, onOpenRuns }: UsageModelsViewProps) => {
  const { options, getModelLabel } = useModelCatalog();
  const { data: series, isPending, isError, isPlaceholderData: stale } = useUsageSeries(params);
  const hoveredDay = useUsageHoverStore((state) => state.day);
  const setDay = useUsageHoverStore((state) => state.setDay);
  const asTable = useUsageTableStore((state) => state.asTable);
  const toggleTable = useUsageTableStore((state) => state.toggle);

  // While a new metric loads, the dimmed chart keeps the labels and units of the data it shows.
  const displayedParams = series ? { ...params, metric: series.metric } : params;
  const highlighted = series ? highlightedKey(series, params.pinned) : null;
  const hoverIndex = series && hoveredDay ? series.days.indexOf(hoveredDay) : -1;
  const dayIndex = series ? (hoverIndex === -1 ? series.days.length - 1 : hoverIndex) : 0;

  // Only a Model pins; Run and Other are not a Model with a detail of its own.
  const pin = (key: string) => {
    if (key !== 'run' && key !== 'other') onPin(key);
  };

  return (
    <section
      aria-label={text.dataLabel}
      aria-busy={stale}
      className={cn('flex flex-col transition-opacity', stale && 'opacity-60')}
    >
      {isError && <p className="px-5 text-sm text-muted-foreground">{text.loadFailed}</p>}
      {isPending && (
        <output
          aria-label={text.loading}
          className="grid gap-4 px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]"
        >
          <Skeleton className="h-[19rem] rounded-xl" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-9" />
            ))}
          </div>
        </output>
      )}
      {series && series.series.length === 0 && (
        <p className="px-5 text-sm text-muted-foreground">{text.empty}</p>
      )}
      {series && series.series.length > 0 && (
        <>
          {asTable ? (
            <div className="px-5">
              <UsageTable series={series} metric={displayedParams.metric} view={params.view} />
            </div>
          ) : (
            <div className="grid gap-4 px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
              <UsageChartCard
                params={displayedParams}
                series={series}
                hoverIndex={hoverIndex === -1 ? null : hoverIndex}
                onHoverIndexChange={(index) => setDay(index === null ? null : series.days[index])}
                onPin={pin}
                highlighted={highlighted}
              />
              <UsageRankedList
                rows={rankRows(series, dayIndex, params.view, options, getModelLabel)}
                dayLabel={formatDay(series.days[dayIndex])}
                highlighted={highlighted}
                pinned={params.pinned}
                formatValue={(value) =>
                  formatSeriesValue(displayedParams.metric, params.view, value)
                }
                onPin={pin}
                onOpenRuns={onOpenRuns}
              />
            </div>
          )}
          <UsageDataFootnote
            note={text.notes[displayedParams.metric]}
            asTable={asTable}
            onToggle={toggleTable}
          />
        </>
      )}
    </section>
  );
};
