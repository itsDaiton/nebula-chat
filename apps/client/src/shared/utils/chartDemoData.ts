import type { ChartDatum, ChartSeries } from '@/shared/types/types';

export const DEMO_SERIES: ChartSeries[] = [
  { key: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  { key: 'run', label: 'Run' },
  { key: 'claude-haiku', label: 'Claude 3.5 Haiku' },
  { key: 'gpt-4o-mini', label: 'GPT-4o mini' },
  { key: 'gpt-5', label: 'GPT-5' },
  { key: 'claude-sonnet', label: 'Claude 3.5 Sonnet' },
];

const DAYS = 30;
const START = Date.UTC(2026, 8, 28);
const BASE = [150, 90, 75, 58, 40, 28];

// Shaped like the usage API's per-day, per-Model rows; deterministic so tests and screenshots repeat.
export const DEMO_DATA: ChartDatum[] = Array.from({ length: DAYS }, (_, day) => {
  const date = new Date(START + day * 86_400_000).toISOString().slice(0, 10);
  return DEMO_SERIES.map((s, i) => ({
    date,
    seriesKey: s.key,
    value: Math.round(BASE[i] * (0.8 + 0.25 * Math.sin(day / 3 + i) + day / 150)),
  }));
}).flat();
