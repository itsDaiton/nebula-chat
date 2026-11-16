import { useMemo } from 'react';
import { create } from 'zustand';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StackedAreaChart } from '@/shared/components/charts/StackedAreaChart';
import type { ChartDatum } from '@/shared/types/types';

const series = [
  { key: 'a', label: 'Alpha' },
  { key: 'b', label: 'Beta' },
];
const data: ChartDatum[] = ['2026-10-01', '2026-10-02', '2026-10-03'].flatMap((date, i) => [
  { date, seriesKey: 'a', value: 10 + i },
  { date, seriesKey: 'b', value: 5 + i },
]);

type HarnessState = {
  active: string | null;
  hover: number | null;
  setActive: (key: string | null) => void;
  setHover: (index: number | null) => void;
};

const Harness = ({
  onHover,
  initialActive = null,
}: {
  onHover: (index: number | null) => void;
  initialActive?: string | null;
}) => {
  const useHarnessStore = useMemo(
    () =>
      create<HarnessState>()((set) => ({
        active: initialActive,
        hover: null,
        setActive: (active) => set({ active }),
        setHover: (hover) => set({ hover }),
      })),
    [initialActive],
  );
  const { active, hover, setActive, setHover } = useHarnessStore();
  return (
    <>
      <output data-testid="state">{`${active}|${hover}`}</output>
      <StackedAreaChart
        data={data}
        series={series}
        activeSeries={active}
        onActiveSeriesChange={setActive}
        hoverIndex={hover}
        onHoverIndexChange={(index) => {
          setHover(index);
          onHover(index);
        }}
        ariaLabel="Prompts per day"
      />
    </>
  );
};

describe('StackedAreaChart', () => {
  it('renders a named image for the chart', () => {
    render(<Harness onHover={vi.fn()} />);

    expect(screen.getByRole('img', { name: 'Prompts per day' })).toBeInTheDocument();
  });

  it('reports the day index when keyboard focus moves along the chart', () => {
    const onHover = vi.fn();
    render(<Harness onHover={onHover} />);
    const chart = screen.getByRole('img', { name: 'Prompts per day' });

    fireEvent.focus(chart);
    fireEvent.keyDown(chart, { key: 'ArrowRight' });

    expect(onHover).toHaveBeenCalled();
    expect(onHover).toHaveBeenLastCalledWith(1);
  });

  it('reflects an externally set hoverIndex without reporting it back', () => {
    const onHover = vi.fn();
    const { rerender } = render(
      <StackedAreaChart
        data={data}
        series={series}
        activeSeries={null}
        onActiveSeriesChange={vi.fn()}
        hoverIndex={null}
        onHoverIndexChange={onHover}
        ariaLabel="Prompts per day"
      />,
    );

    rerender(
      <StackedAreaChart
        data={data}
        series={series}
        activeSeries="a"
        onActiveSeriesChange={vi.fn()}
        hoverIndex={2}
        onHoverIndexChange={onHover}
        ariaLabel="Prompts per day"
      />,
    );

    expect(screen.getByRole('img', { name: 'Prompts per day' })).toBeInTheDocument();
    expect(onHover).not.toHaveBeenCalledWith(null);
  });

  it('renders the caller-supplied tooltip for the focused day', async () => {
    render(
      <StackedAreaChart
        data={data}
        series={series}
        activeSeries="b"
        onActiveSeriesChange={vi.fn()}
        hoverIndex={null}
        onHoverIndexChange={vi.fn()}
        ariaLabel="Prompts per day"
        renderTooltip={({ date, rows }) => (
          <span>{`${date}: ${rows.map((r) => `${r.label}=${r.value}${r.active ? '*' : ''}`).join(', ')}`}</span>
        )}
      />,
    );
    const chart = screen.getByRole('img', { name: 'Prompts per day' });

    fireEvent.focus(chart);
    fireEvent.keyDown(chart, { key: 'ArrowRight' });

    expect(await screen.findByText('2026-10-02: Alpha=11, Beta=6*')).toBeInTheDocument();
  });

  it('pins the series a click lands on', () => {
    const onActive = vi.fn();
    render(
      <StackedAreaChart
        data={data}
        series={series}
        activeSeries={null}
        onActiveSeriesChange={onActive}
        hoverIndex={null}
        onHoverIndexChange={vi.fn()}
        ariaLabel="Prompts per day"
      />,
    );
    const chart = screen.getByRole('img', { name: 'Prompts per day' });

    fireEvent.focus(chart);
    fireEvent.keyDown(chart, { key: 'Enter' });

    expect(onActive).toHaveBeenCalledWith(expect.stringMatching(/^[ab]$/));
  });
});
