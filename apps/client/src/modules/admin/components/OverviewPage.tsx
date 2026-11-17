import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { getGetAdminOverviewQueryOptions } from '@/libs/api/generated/admin/admin';
import { LatestAuditEntries } from '@/modules/admin/components/LatestAuditEntries';
import { OverviewRangeSwitch } from '@/modules/admin/components/OverviewRangeSwitch';
import { OverviewTile } from '@/modules/admin/components/OverviewTile';
import { overviewTiles } from '@/modules/admin/utils/overviewKpis';
import { resources } from '@/resources';

const route = getRouteApi('/_app/admin/');
const text = resources.admin.overview;

export const OverviewPage = () => {
  const { range = '30d' } = route.useSearch();
  const navigate = route.useNavigate();
  const { data, isError } = useQuery(getGetAdminOverviewQueryOptions({ range }));
  const tiles = data ? overviewTiles(data) : [];

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
      <div className="grid grid-cols-1 gap-2.5 px-5 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((tile) => (
          <OverviewTile
            key={tile.id}
            label={text.tiles[tile.id]}
            range={range}
            value={tile.value}
            delta={tile.delta}
            series={tile.series}
          />
        ))}
      </div>
      <LatestAuditEntries />
    </div>
  );
};
