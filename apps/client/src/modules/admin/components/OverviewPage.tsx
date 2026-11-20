import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { LatestAuditEntries } from '@/modules/admin/components/LatestAuditEntries';
import { OverviewTilesSkeleton } from '@/modules/admin/components/OverviewTilesSkeleton';
import { OverviewRangeSwitch } from '@/modules/admin/components/OverviewRangeSwitch';
import { OverviewTile } from '@/modules/admin/components/OverviewTile';
import { overviewTiles } from '@/modules/admin/utils/overviewKpis';
import { overviewQueryOptions } from '@/modules/admin/utils/overviewQueryOptions';
import { resources } from '@/resources';
import { cn } from '@/shared/utils/cn';

const route = getRouteApi('/_app/admin/');
const text = resources.admin.overview;

export const OverviewPage = () => {
  const { range = '30d' } = route.useSearch();
  const navigate = route.useNavigate();
  const { data, isPending, isError, isPlaceholderData } = useQuery(overviewQueryOptions(range));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <h1 className="text-lg font-semibold tracking-[-0.02em]">{text.title}</h1>
        <span className="grow" />
        <OverviewRangeSwitch
          value={range}
          onChange={(next) => void navigate({ search: { range: next } })}
        />
      </div>
      {isError && <p className="px-5 text-sm text-muted-foreground">{text.loadFailed}</p>}
      {isPending && (
        <output aria-label={text.loading} className="px-5">
          <OverviewTilesSkeleton />
        </output>
      )}
      {data && (
        <section
          aria-label={text.tilesLabel}
          aria-busy={isPlaceholderData}
          className={cn(
            'grid grid-cols-1 gap-2.5 px-5 transition-opacity sm:grid-cols-2 xl:grid-cols-3',
            isPlaceholderData && 'opacity-60',
          )}
        >
          {overviewTiles(data).map((tile) => (
            <OverviewTile
              key={tile.id}
              label={text.tiles[tile.id]}
              range={range}
              value={tile.value}
              delta={tile.delta}
              series={tile.series}
            />
          ))}
        </section>
      )}
      <LatestAuditEntries />
    </div>
  );
};
