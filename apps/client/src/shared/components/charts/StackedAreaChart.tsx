import { useMemo } from 'react';
import { areaY, crosshair, defineChart, stack } from '@tanstack/charts';
import { createChartCursor, cursorHost } from '@tanstack/charts/cursor';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { scaleUtc } from '@tanstack/charts/scales/time';
import { Chart } from '@tanstack/charts/react/tooltip';
import { tooltip } from '@tanstack/charts/tooltip';
import type { StackedAreaChartProps } from '@/shared/types/types';
import { dateIndexOf, seriesPaints, sortedDates, toDateKey } from '@/shared/utils/chartSeries';

// A module-level default keeps its identity; an inline one would rebuild the chart definition each render.
const identityDate = (date: string) => date;

export const StackedAreaChart = ({
  data,
  series,
  activeSeries,
  onActiveSeriesChange,
  hoverIndex,
  onHoverIndexChange,
  height = 240,
  ariaLabel,
  formatValue = String,
  formatDate = identityDate,
  renderTooltip,
}: StackedAreaChartProps) => {
  const cursor = useMemo(() => createChartCursor<Date, number>(), []);
  const dates = useMemo(() => sortedDates(data), [data]);
  const rows = useMemo(() => data.map((d) => ({ ...d, day: new Date(d.date) })), [data]);
  const keys = useMemo(() => series.map((s) => s.key), [series]);
  const paints = useMemo(() => seriesPaints(series, activeSeries), [series, activeSeries]);

  // The list owns hoverIndex too, so a guarded render-time write keeps the crosshair on it.
  const wanted = hoverIndex === null ? undefined : dates[hoverIndex];
  const current = cursor.getState()?.value?.x;
  if ((wanted ?? null) !== (current ? toDateKey(current) : null)) {
    cursor.setState(
      wanted
        ? { anchor: 'value', value: { x: new Date(wanted) }, source: 'programmatic', pinned: false }
        : null,
    );
  }

  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          areaY(rows, {
            x: 'day',
            y: 'value',
            z: 'seriesKey',
            color: 'seriesKey',
            layout: stack({ order: keys }),
            fillOpacity: 1,
          }),
          crosshair({ x: true, y: false, marker: true, strokeDasharray: '3 3' }),
        ],
        scales: {
          x: {
            scale: scaleUtc,
            axis: {
              ticks: { format: (value) => formatDate(toDateKey(new Date(value))) },
            },
          },
          y: {
            scale: scaleLinear,
            grid: true,
            axis: { ticks: { format: (value) => formatValue(Number(value)) } },
          },
        },
        color: { domain: keys, range: paints },
        focus: 'group-x',
        maxFocusDistance: Number.POSITIVE_INFINITY,
        cursor: { use: cursorHost, controller: cursor, mode: 'focus', match: 'x' },
        tooltip: renderTooltip ? tooltip : undefined,
      }),
    [rows, keys, paints, cursor, formatDate, formatValue, renderTooltip],
  );

  return (
    <div className="text-muted-foreground">
      <Chart
        definition={definition}
        height={height}
        ariaLabel={ariaLabel}
        onFocusGroupChange={(points) => {
          const first = points[0];
          onHoverIndexChange(first ? dateIndexOf(dates, first.xValue as Date) : null);
        }}
        onSelect={(point) => {
          if (point) onActiveSeriesChange(String(point.group));
        }}
        renderTooltipBody={
          renderTooltip
            ? ({ points }) => {
                const index = dateIndexOf(dates, points[0]?.xValue as Date) ?? 0;
                const day = dates[index];
                return renderTooltip({
                  index,
                  date: day,
                  rows: series.map((s) => ({
                    key: s.key,
                    label: s.label,
                    active: s.key === activeSeries,
                    value: data.find((d) => d.date === day && d.seriesKey === s.key)?.value ?? 0,
                  })),
                });
              }
            : undefined
        }
      />
    </div>
  );
};
