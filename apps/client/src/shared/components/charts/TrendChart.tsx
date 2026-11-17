import { useMemo } from 'react';
import { areaY, crosshair, defineChart, lineY } from '@tanstack/charts';
import { createChartCursor, cursorHost } from '@tanstack/charts/cursor';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { scaleUtc } from '@tanstack/charts/scales/time';
import { Chart } from '@tanstack/charts/react/tooltip';
import { tooltip } from '@tanstack/charts/tooltip';
import type { TrendChartProps } from '@/shared/types/types';
import { ACTIVE_PAINT, mutedPaint, dateIndexOf, toDateKey } from '@/shared/utils/chartSeries';

const identityDate = (date: string) => date;

export const TrendChart = ({
  days,
  series,
  height = 200,
  ariaLabel,
  formatValue = String,
  formatDate = identityDate,
}: TrendChartProps) => {
  const cursor = useMemo(() => createChartCursor<Date, number>(), []);
  const keys = useMemo(() => series.map((s) => s.key), [series]);
  const rows = useMemo(
    () =>
      series.flatMap((s) =>
        days.map((date, i) => ({ day: new Date(date), seriesKey: s.key, value: s.values[i] ?? 0 })),
      ),
    [days, series],
  );
  // The first series is the subject in the foreground; a comparison sits behind it in grey.
  const paints = useMemo(
    () => series.map((_, i) => (i === 0 ? ACTIVE_PAINT : mutedPaint(1))),
    [series],
  );

  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          ...(series.length === 1
            ? [areaY(rows, { x: 'day', y: 'value', fill: ACTIVE_PAINT, fillOpacity: 0.08 })]
            : []),
          lineY(rows, {
            x: 'day',
            y: 'value',
            z: 'seriesKey',
            color: 'seriesKey',
            strokeWidth: 1.5,
          }),
          crosshair({ x: true, y: false, marker: true, strokeDasharray: '3 3' }),
        ],
        scales: {
          x: {
            scale: scaleUtc,
            axis: { ticks: { format: (value) => formatDate(toDateKey(new Date(value))) } },
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
        tooltip,
      }),
    [rows, series.length, keys, paints, cursor, formatDate, formatValue],
  );

  return (
    <div className="text-muted-foreground">
      <Chart
        definition={definition}
        height={height}
        ariaLabel={ariaLabel}
        renderTooltipBody={({ points }) => {
          const index = dateIndexOf(days, points[0]?.xValue as Date) ?? 0;
          return (
            <div className="font-mono text-xs">
              <div className="mb-1 text-muted-foreground">{formatDate(days[index])}</div>
              {series.map((s) => (
                <div key={s.key} className="flex justify-between gap-4">
                  <span>{s.label}</span>
                  <span className="tabular-nums">{formatValue(s.values[index] ?? 0)}</span>
                </div>
              ))}
            </div>
          );
        }}
      />
    </div>
  );
};
