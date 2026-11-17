import { useMemo } from 'react';
import { useModelCatalog } from '@/modules/chat/hooks/useModelCatalog';
import type { UsageChartCardProps } from '@/modules/admin/types/types';
import { toChartData, toChartSeries } from '@/modules/admin/utils/usageData';
import { formatDay, formatSeriesValue } from '@/modules/admin/utils/usageFormat';
import { resources } from '@/resources';
import { StackedAreaChart } from '@/shared/components/charts/StackedAreaChart';

const text = resources.admin.usage;

export const UsageChartCard = ({
  params,
  series,
  hoverIndex,
  onHoverIndexChange,
  onPin,
  highlighted,
}: UsageChartCardProps) => {
  const { getModelLabel } = useModelCatalog();
  const { metric, view } = params;
  const data = useMemo(() => toChartData(series, view), [series, view]);
  const chartSeries = useMemo(() => toChartSeries(series, getModelLabel), [series, getModelLabel]);
  const formatValue = useMemo(
    () => (value: number) => formatSeriesValue(metric, view, value),
    [metric, view],
  );
  const title = text.metrics[metric];

  return (
    <div className="min-w-0 rounded-xl border border-border bg-panel px-4 py-3.5">
      <div className="pb-2 text-[13px] text-muted-foreground">{text.chartTitle(title)}</div>
      <StackedAreaChart
        data={data}
        series={chartSeries}
        activeSeries={highlighted}
        onActiveSeriesChange={(key) => key && onPin(key)}
        hoverIndex={hoverIndex}
        onHoverIndexChange={onHoverIndexChange}
        ariaLabel={text.chartLabel(title)}
        formatValue={formatValue}
        formatDate={formatDay}
      />
    </div>
  );
};
