import { getRouteApi } from '@tanstack/react-router';
import { AdminPageTitle } from '@/modules/admin/components/AdminPageTitle';
import { UsageModelsView } from '@/modules/admin/components/UsageModelsView';
import { UsageRunsView } from '@/modules/admin/components/UsageRunsView';
import { UsageTiles } from '@/modules/admin/components/UsageTiles';
import { UsageToolbar } from '@/modules/admin/components/UsageToolbar';
import { useUsageTotals } from '@/modules/admin/hooks/useUsageTotals';
import type { UsageSearch } from '@/modules/admin/types/types';
import { resolveUsageSearch } from '@/modules/admin/utils/usageData';
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
  const {
    data: totals,
    isPending: totalsPending,
    isPlaceholderData: totalsStale,
  } = useUsageTotals(params);

  const change = (next: UsageSearch) =>
    void navigate({
      search: (previous) => ({
        ...previous,
        ...next,
        // A pinned Model means nothing on the Runs tab, and an Agent nothing on the others.
        ...(next.metric && (next.metric === 'runs') !== (params.metric === 'runs')
          ? { pinned: undefined }
          : {}),
      }),
      replace: true,
    });

  const pin = (key: string) => {
    const next = key === params.pinned ? undefined : key;
    change({ pinned: next });
    if (next) usePanelStore.getState().openRight();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <AdminPageTitle>{text.title}</AdminPageTitle>
      <UsageToolbar params={params} onChange={change} />
      <section
        aria-label={text.tilesLabel}
        aria-busy={totalsStale}
        className={cn('transition-opacity', totalsStale && 'opacity-60')}
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
          <UsageTiles totals={totals} tab={params.metric} />
        )}
      </section>
      {params.metric === 'runs' ? (
        <UsageRunsView params={params} onPin={pin} />
      ) : (
        <UsageModelsView
          params={params}
          onPin={pin}
          onOpenRuns={() => change({ metric: 'runs', pinned: undefined })}
        />
      )}
    </div>
  );
};
