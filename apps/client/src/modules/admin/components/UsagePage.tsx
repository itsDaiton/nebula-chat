import { getRouteApi } from '@tanstack/react-router';
import { InfoIcon } from 'lucide-react';
import { AdminPageTitle } from '@/modules/admin/components/AdminPageTitle';
import { UsageChartCard } from '@/modules/admin/components/UsageChartCard';
import { UsageRankedList } from '@/modules/admin/components/UsageRankedList';
import { UsageTable } from '@/modules/admin/components/UsageTable';
import { UsageTiles } from '@/modules/admin/components/UsageTiles';
import { UsageToolbar } from '@/modules/admin/components/UsageToolbar';
import { useUsageSeries } from '@/modules/admin/hooks/useUsageSeries';
import { useUsageTotals } from '@/modules/admin/hooks/useUsageTotals';
import { useUsageTableStore } from '@/modules/admin/stores/useUsageTableStore';
import { useUsageHoverStore } from '@/modules/admin/stores/useUsageHoverStore';
import type { UsageSearch } from '@/modules/admin/types/types';
import { highlightedKey, rankRows, resolveUsageSearch } from '@/modules/admin/utils/usageData';
import { formatDay, formatSeriesValue } from '@/modules/admin/utils/usageFormat';
import { useModelCatalog } from '@/modules/chat/hooks/useModelCatalog';
import { resources } from '@/resources';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { usePanelStore } from '@/shared/stores/usePanelStore';
import { cn } from '@/shared/utils/cn';

const route = getRouteApi('/_app/admin/usage');
const text = resources.admin.usage;

export const UsagePage = () => {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const params = resolveUsageSearch(search);
  const { options, getModelLabel } = useModelCatalog();
  const {
    data: series,
    isPending: seriesPending,
    isError,
    isPlaceholderData: seriesStale,
  } = useUsageSeries(params);
  const {
    data: totals,
    isPending: totalsPending,
    isPlaceholderData: totalsStale,
  } = useUsageTotals(params);
  const busy = seriesStale || totalsStale;
  const hoveredDay = useUsageHoverStore((state) => state.day);
  const setDay = useUsageHoverStore((state) => state.setDay);
  const asTable = useUsageTableStore((state) => state.asTable);
  const toggleTable = useUsageTableStore((state) => state.toggle);

  const change = (next: UsageSearch) =>
    void navigate({ search: (previous) => ({ ...previous, ...next }), replace: true });

  // While a new metric loads, the dimmed chart keeps the labels and units of the data it shows.
  const shown = series ? { ...params, metric: series.metric } : params;
  const highlighted = series ? highlightedKey(series, params.pinned) : null;
  const hoverIndex = series && hoveredDay ? series.days.indexOf(hoveredDay) : -1;
  const dayIndex = series ? (hoverIndex === -1 ? series.days.length - 1 : hoverIndex) : 0;

  // Only a Model pins; Run and Other are not a Model with a detail of its own.
  const pin = (key: string) => {
    if (key === 'run' || key === 'other') return;
    const next = key === params.pinned ? undefined : key;
    change({ pinned: next });
    if (next) usePanelStore.getState().openRight();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <AdminPageTitle>{text.title}</AdminPageTitle>
      <UsageToolbar params={params} onChange={change} />
      {isError && <p className="px-5 text-sm text-muted-foreground">{text.loadFailed}</p>}
      <section
        aria-label={text.dataLabel}
        aria-busy={busy}
        className={cn('flex flex-col transition-opacity', busy && 'opacity-60')}
      >
        {totalsPending ? (
          <output
            aria-label={text.tilesLoading}
            className="grid grid-cols-2 gap-2.5 px-5 pb-4 sm:grid-cols-3 xl:grid-cols-6"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-[5.5rem] rounded-xl" />
            ))}
          </output>
        ) : (
          <UsageTiles totals={totals} />
        )}
        {seriesPending && (
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
                <UsageTable series={series} metric={shown.metric} view={params.view} />
              </div>
            ) : (
              <div className="grid gap-4 px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
                <UsageChartCard
                  params={shown}
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
                  formatValue={(value) => formatSeriesValue(shown.metric, params.view, value)}
                  onPin={pin}
                />
              </div>
            )}
            <div className="flex items-start gap-2 px-5 py-3 text-[12.5px] text-muted-foreground">
              <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
              <p className="m-0">
                {text.note}{' '}
                <button
                  type="button"
                  aria-pressed={asTable}
                  className="underline underline-offset-2 hover:text-foreground focus-visible:outline-none"
                  onClick={toggleTable}
                >
                  {asTable ? text.viewAsChart : text.viewAsTable}
                </button>
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
};
