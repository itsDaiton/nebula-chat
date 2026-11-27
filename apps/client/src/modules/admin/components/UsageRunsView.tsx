import { UsageDataFootnote } from '@/modules/admin/components/UsageDataFootnote';
import { UsageRankedList } from '@/modules/admin/components/UsageRankedList';
import { UsageRunsChartCard } from '@/modules/admin/components/UsageRunsChartCard';
import { UsageRunsTable } from '@/modules/admin/components/UsageRunsTable';
import { useUsageRunSeries } from '@/modules/admin/hooks/useUsageRunSeries';
import { useUsageHoverStore } from '@/modules/admin/stores/useUsageHoverStore';
import { useUsageTableStore } from '@/modules/admin/stores/useUsageTableStore';
import type { UsageRunsViewProps } from '@/modules/admin/types/types';
import { hasRuns, highlightedAgent, rankAgentRows } from '@/modules/admin/utils/usageData';
import { formatDay, formatSpend } from '@/modules/admin/utils/usageFormat';
import { resources } from '@/resources';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { cn } from '@/shared/utils/cn';

const text = resources.admin.usage;
const runText = text.runs;

/** The Runs tab: how Runs ended per day, and which Agent spent what on the hovered day. */
export const UsageRunsView = ({ params, onPin }: UsageRunsViewProps) => {
  const { data: series, isPending, isError, isPlaceholderData: stale } = useUsageRunSeries(params);
  const hoveredDay = useUsageHoverStore((state) => state.day);
  const setDay = useUsageHoverStore((state) => state.setDay);
  const asTable = useUsageTableStore((state) => state.asTable);
  const toggleTable = useUsageTableStore((state) => state.toggle);

  const hoverIndex = series && hoveredDay ? series.days.indexOf(hoveredDay) : -1;
  const dayIndex = series ? (hoverIndex === -1 ? series.days.length - 1 : hoverIndex) : 0;

  return (
    <section
      aria-label={runText.dataLabel}
      aria-busy={stale}
      className={cn('flex flex-col transition-opacity', stale && 'opacity-60')}
    >
      {isError && <p className="px-5 text-sm text-muted-foreground">{runText.loadFailed}</p>}
      {isPending && !isError && (
        <output
          aria-label={runText.loading}
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
      {series && !hasRuns(series) && (
        <p className="px-5 text-sm text-muted-foreground">{runText.empty}</p>
      )}
      {series && hasRuns(series) && (
        <>
          {asTable ? (
            <div className="px-5">
              <UsageRunsTable series={series} />
            </div>
          ) : (
            <div className="grid gap-4 px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
              <UsageRunsChartCard
                series={series}
                hoverIndex={hoverIndex === -1 ? null : hoverIndex}
                onHoverIndexChange={(index) => setDay(index === null ? null : series.days[index])}
              />
              <UsageRankedList
                rows={rankAgentRows(series, dayIndex)}
                dayLabel={formatDay(series.days[dayIndex])}
                highlighted={highlightedAgent(series, params.pinned)}
                pinned={params.pinned}
                formatValue={formatSpend}
                onPin={onPin}
              />
            </div>
          )}
          <UsageDataFootnote note={text.notes.runs} asTable={asTable} onToggle={toggleTable} />
        </>
      )}
    </section>
  );
};
