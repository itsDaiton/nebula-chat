import { useMemo } from 'react';
import { areaY, defineChart, lineY } from '@tanstack/charts';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { Chart } from '@tanstack/charts/react/tooltip';
import type { SparklineProps } from '@/shared/types/types';

const WIDTH = 110;
const HEIGHT = 34;

export const Sparkline = ({ values, label }: SparklineProps) => {
  const definition = useMemo(() => {
    const rows = values.map((value, index) => ({ index, value }));
    const floor = Math.min(0, ...values);
    // The ceiling follows the data, so a fractional spend series isn't flattened by a fixed span.
    const ceiling = Math.max(...values, floor + 1e-9);
    return defineChart({
      marks: [
        areaY(rows, { x: 'index', y: 'value', fill: 'var(--foreground)', fillOpacity: 0.08 }),
        lineY(rows, { x: 'index', y: 'value', stroke: 'var(--foreground)', strokeWidth: 1.4 }),
      ],
      // Zero stays on the baseline so a flat series reads as flat.
      scales: {
        x: { scale: scaleLinear, axis: false },
        y: {
          scale: scaleLinear,
          axis: false,
          domain: [floor, ceiling],
        },
      },
    });
  }, [values]);

  return (
    <div className="shrink-0 text-foreground">
      <Chart definition={definition} width={WIDTH} height={HEIGHT} ariaLabel={label} />
    </div>
  );
};
