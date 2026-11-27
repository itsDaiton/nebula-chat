import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { XIcon } from 'lucide-react';
import { getGetRunUsageAgentDetailQueryOptions } from '@/libs/api/generated/admin/admin';
import { UsageAgentDetailBody } from '@/modules/admin/components/UsageAgentDetailBody';
import { useUsageRunSeries } from '@/modules/admin/hooks/useUsageRunSeries';
import { useUsageHoverStore } from '@/modules/admin/stores/useUsageHoverStore';
import type { UsageAgentDetailPanelProps } from '@/modules/admin/types/types';
import { highlightedAgent } from '@/modules/admin/utils/usageData';
import { formatLongDay } from '@/modules/admin/utils/usageFormat';
import { resources } from '@/resources';
import { IconButton } from '@/shared/components/ui/icon-button';

const route = getRouteApi('/_app/admin/usage');
const text = resources.admin.usage.detail;
const runText = resources.admin.usage.runs.detail;

/** The Runs tab's right panel: the pinned (else costliest) Agent on the hovered day. */
export const UsageAgentDetailPanel = ({ params, onClose }: UsageAgentDetailPanelProps) => {
  const navigate = route.useNavigate();
  const hoveredDay = useUsageHoverStore((state) => state.day);
  const { data: series } = useUsageRunSeries(params);

  const agent = series ? highlightedAgent(series, params.pinned) : null;
  const day = hoveredDay ?? series?.days.at(-1) ?? null;
  const { data: detail, isError } = useQuery({
    ...getGetRunUsageAgentDetailQueryOptions({
      agent: agent ?? '',
      day: day ?? '',
      range: params.range,
      audience: params.audience,
    }),
    enabled: agent !== null && day !== null,
    meta: { inlineError: true },
  });
  const pinned = agent !== null && agent === params.pinned;

  const unpin = () => {
    void navigate({ search: (previous) => ({ ...previous, pinned: undefined }), replace: true });
    onClose();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-3.5">
      <div className="flex items-center gap-2.5">
        <div className="min-w-0 grow">
          <h2 className="truncate text-[15px] font-semibold">{agent ?? ''}</h2>
          {pinned && <p className="m-0 truncate font-mono text-xs text-faint">{text.pinned}</p>}
        </div>
        <IconButton variant="ghost" size="icon" label={runText.close} onClick={unpin}>
          <XIcon />
        </IconButton>
      </div>
      {day && <div className="text-[13px] text-foreground-secondary">{formatLongDay(day)}</div>}
      {!agent && <p className="text-[12.5px] text-muted-foreground">{runText.empty}</p>}
      {isError && <p className="text-[12.5px] text-muted-foreground">{runText.loadFailed}</p>}
      {detail && <UsageAgentDetailBody detail={detail} />}
    </div>
  );
};
