import { UsageDetailRow } from '@/modules/admin/components/UsageDetailRow';
import { Sparkline } from '@/modules/admin/components/Sparkline';
import type { UsageDetailBodyProps } from '@/modules/admin/types/types';
import {
  formatCount,
  formatPercent,
  formatSeconds,
  formatSpend,
} from '@/modules/admin/utils/usageFormat';
import { resources } from '@/resources';

const text = resources.admin.usage.detail;

const orDash = <T,>(value: T | null, format: (value: T) => string) =>
  value === null ? '—' : format(value);

export const UsageDetailBody = ({ detail }: UsageDetailBodyProps) => (
  <>
    <dl className="m-0 flex flex-col gap-2.5">
      <UsageDetailRow label={text.prompts} value={formatCount(detail.prompts)} />
      <UsageDetailRow
        label={text.input}
        value={orDash(detail.inputPerCall, (v) => text.tokens(formatCount(v)))}
      />
      <UsageDetailRow
        label={text.output}
        value={orDash(detail.outputPerCall, (v) => text.tokens(formatCount(v)))}
      />
      <UsageDetailRow label={text.cost} value={orDash(detail.costPerCall, formatSpend)} />
      <UsageDetailRow label={text.cacheReplays} value={formatCount(detail.cacheReplays)} />
      <UsageDetailRow
        label={text.completion}
        value={orDash(detail.completionRate, (v) => formatPercent(v * 100))}
      />
      <UsageDetailRow label={text.duration} value={orDash(detail.avgDurationMs, formatSeconds)} />
    </dl>
    <div className="flex flex-col gap-2">
      <div className="text-[13px] text-muted-foreground">{text.trend(detail.trend.length)}</div>
      <Sparkline values={detail.trend} label={text.trendLabel} />
    </div>
  </>
);
