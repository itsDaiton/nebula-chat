import type { SparklineProps } from '@/modules/admin/types/types';

const WIDTH = 110;
const HEIGHT = 34;
const PAD = 2;

// Inline until the chart wrapper exists.
export const Sparkline = ({ values, label }: SparklineProps) => {
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const step = values.length > 1 ? WIDTH / (values.length - 1) : 0;
  const points = values.map((value, i) => {
    const y = HEIGHT - PAD - ((value - min) / span) * (HEIGHT - 2 * PAD);
    return `${(i * step).toFixed(1)},${y.toFixed(1)}`;
  });
  const line = points.join(' ');

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
      height={HEIGHT}
      className="shrink-0 text-foreground"
    >
      {points.length > 0 && (
        <>
          <polygon
            points={`0,${HEIGHT} ${line} ${WIDTH},${HEIGHT}`}
            fill="currentColor"
            opacity={0.08}
          />
          <polyline
            points={line}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
};
