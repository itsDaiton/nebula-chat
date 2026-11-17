import { useQuery } from '@tanstack/react-query';
import { getRouteApi, useSearch } from '@tanstack/react-router';
import { XIcon } from 'lucide-react';
import { getGetModelUsageDetailQueryOptions } from '@/libs/api/generated/admin/admin';
import { UsageDetailBody } from '@/modules/admin/components/UsageDetailBody';
import { useUsageSeries } from '@/modules/admin/hooks/useUsageSeries';
import { useUsageHoverStore } from '@/modules/admin/stores/useUsageHoverStore';
import type { UsageDetailPanelProps, UsageSearch } from '@/modules/admin/types/types';
import { highlightedKey, resolveUsageSearch } from '@/modules/admin/utils/usageData';
import { formatLongDay } from '@/modules/admin/utils/usageFormat';
import { useModelCatalog } from '@/modules/chat/hooks/useModelCatalog';
import { resources } from '@/resources';
import { ProviderLogo } from '@/shared/components/ProviderLogo';
import { IconButton } from '@/shared/components/ui/icon-button';

const route = getRouteApi('/_app/admin/usage');
const text = resources.admin.usage.detail;

/** The Model usage page's right panel: the pinned (else top) Model on the hovered day. */
export const UsageDetailPanel = ({ onClose }: UsageDetailPanelProps) => {
  // Not strict: the panel can outlive its route for a render while the dashboard navigates away.
  const search = useSearch({ strict: false }) as UsageSearch;
  const navigate = route.useNavigate();
  const params = resolveUsageSearch(search);
  const { options, getModelLabel } = useModelCatalog();
  const hoveredDay = useUsageHoverStore((state) => state.day);
  const { data: series } = useUsageSeries(params);

  const model = series ? highlightedKey(series, params.pinned) : null;
  const day = hoveredDay ?? series?.days.at(-1) ?? null;
  const { data: detail, isError } = useQuery({
    ...getGetModelUsageDetailQueryOptions({
      model: model ?? '',
      day: day ?? '',
      range: params.range,
      audience: params.audience,
    }),
    enabled: model !== null && day !== null,
    meta: { inlineError: true },
  });
  const provider = options.find((option) => option.value === model)?.provider;
  const pinned = model !== null && model === params.pinned;

  const unpin = () => {
    void navigate({ search: (previous) => ({ ...previous, pinned: undefined }), replace: true });
    onClose();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-3.5">
      <div className="flex items-center gap-2.5">
        {provider && <ProviderLogo provider={provider} className="size-6" />}
        <div className="min-w-0 grow">
          <h2 className="truncate text-[15px] font-semibold">
            {model ? getModelLabel(model) : ''}
          </h2>
          {model && (
            <p className="m-0 truncate font-mono text-xs text-faint">
              {pinned ? `${model} · ${text.pinned}` : model}
            </p>
          )}
        </div>
        <IconButton variant="ghost" size="icon" label={text.close} onClick={unpin}>
          <XIcon />
        </IconButton>
      </div>
      {day && <div className="text-[13px] text-foreground-secondary">{formatLongDay(day)}</div>}
      {!model && <p className="text-[12.5px] text-muted-foreground">{text.empty}</p>}
      {isError && <p className="text-[12.5px] text-muted-foreground">{text.loadFailed}</p>}
      {detail && <UsageDetailBody detail={detail} />}
    </div>
  );
};
