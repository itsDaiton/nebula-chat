import { useMemo } from 'react';
import type { UsageRunsChartCardProps } from '@/modules/admin/types/types';
import { toRunChartData, toRunChartSeries } from '@/modules/admin/utils/usageData';
import { formatCount, formatDay } from '@/modules/admin/utils/usageFormat';
import { resources } from '@/resources';
import { StackedAreaChart } from '@/shared/components/charts/StackedAreaChart';

const text = resources.admin.usage.runs;

const noPin = () => undefined;

export const UsageRunsChartCard = ({
  series,
  hoverIndex,
  onHoverIndexChange,
}: UsageRunsChartCardProps) => {
  const data = useMemo(() => toRunChartData(series), [series]);
  const chartSeries = useMemo(() => toRunChartSeries(series), [series]);

  return (
    <div className="min-w-0 rounded-xl border border-border bg-panel px-4 py-3.5">
      <div className="pb-2 text-[13px] text-muted-foreground">{text.chartTitle}</div>
      <StackedAreaChart
        data={data}
        series={chartSeries}
        activeSeries={null}
        onActiveSeriesChange={noPin}
        hoverIndex={hoverIndex}
        onHoverIndexChange={onHoverIndexChange}
        ariaLabel={text.chartLabel}
        formatValue={formatCount}
        formatDate={formatDay}
      />
    </div>
  );
};
