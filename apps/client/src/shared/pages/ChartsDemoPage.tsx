import { useMemo } from 'react';
import { ShareBar } from '@/shared/components/charts/ShareBar';
import { StackedAreaChart } from '@/shared/components/charts/StackedAreaChart';
import { resources } from '@/resources';
import { useChartDemoStore } from '@/shared/stores/useChartDemoStore';
import { cn } from '@/shared/utils/cn';
import { DEMO_DATA, DEMO_SERIES } from '@/shared/utils/chartDemoData';
import { sortedDates } from '@/shared/utils/chartSeries';

const dayFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const formatDate = (date: string) => dayFormat.format(new Date(date));

// Development-only: proves the chart wrapper against usage-shaped data before the Model usage page builds on it.
export const ChartsDemoPage = () => {
  const { activeSeries, hoverIndex, setActiveSeries, setHoverIndex } = useChartDemoStore();
  const dates = useMemo(() => sortedDates(DEMO_DATA), []);
  const index = hoverIndex ?? dates.length - 1;
  const day = dates[index];

  const ranked = useMemo(() => {
    const rows = DEMO_SERIES.map((s) => ({
      ...s,
      value: DEMO_DATA.find((d) => d.date === day && d.seriesKey === s.key)?.value ?? 0,
    })).sort((a, b) => b.value - a.value);
    const total = rows.reduce((sum, r) => sum + r.value, 0);
    return { rows, total };
  }, [day]);

  return (
    <main className="bg-background text-foreground min-h-screen p-8">
      <h1 className="mb-6 text-xl font-semibold">{resources.devCharts.title}</h1>
      <div className="grid max-w-5xl grid-cols-[1fr_320px] gap-6">
        <section className="border-border bg-panel rounded-xl border p-5">
          <div className="text-muted-foreground mb-3 flex justify-between text-sm">
            <span>{resources.devCharts.chartLabel}</span>
            <span className="font-mono">
              {formatDate(day)} · {ranked.total} {resources.devCharts.prompts}
            </span>
          </div>
          <StackedAreaChart
            data={DEMO_DATA}
            series={DEMO_SERIES}
            activeSeries={activeSeries}
            onActiveSeriesChange={setActiveSeries}
            hoverIndex={hoverIndex}
            onHoverIndexChange={setHoverIndex}
            height={260}
            ariaLabel={resources.devCharts.chartLabel}
            formatDate={formatDate}
          />
        </section>
        <section aria-label={resources.devCharts.list}>
          <div className="text-muted-foreground mb-2 flex justify-between px-3 text-sm">
            <span>{formatDate(day)}</span>
            <span className="font-mono">{resources.devCharts.share}</span>
          </div>
          <ul className="flex flex-col">
            {ranked.rows.map((row) => {
              const active = row.key === activeSeries;
              return (
                <li key={row.key}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveSeries(active ? null : row.key)}
                    className={cn(
                      'flex w-full flex-col gap-2 rounded-lg px-3 py-2.5 text-left',
                      active ? 'bg-muted' : 'hover:bg-muted/60',
                    )}
                  >
                    <span className="flex items-center justify-between text-sm">
                      <span>{row.label}</span>
                      <span className="font-mono tabular-nums">
                        {row.value}{' '}
                        <span className="text-muted-foreground">
                          {((row.value / ranked.total) * 100).toFixed(1)}%
                        </span>
                      </span>
                    </span>
                    <ShareBar share={row.value / ranked.total} active={active} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
};
