import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TrendChart } from '@/shared/components/charts/TrendChart';

const days = ['2026-10-01', '2026-10-02', '2026-10-03'];

describe('TrendChart', () => {
  it('renders one series with an accessible label', () => {
    render(
      <TrendChart
        days={days}
        series={[{ key: 'spend', label: 'Spend', values: [1, 2, 3] }]}
        ariaLabel="Estimated spend per day"
      />,
    );

    expect(screen.getByRole('img', { name: 'Estimated spend per day' })).toBeInTheDocument();
  });

  it('renders two series', () => {
    render(
      <TrendChart
        days={days}
        series={[
          { key: 'current', label: 'This period', values: [1, 2, 3] },
          { key: 'previous', label: 'Previous period', values: [2, 2, 1] },
        ]}
        ariaLabel="Spend against the previous period"
        formatValue={(value) => `$${value}`}
        formatDate={(day) => day.slice(5)}
      />,
    );

    expect(
      screen.getByRole('img', { name: 'Spend against the previous period' }),
    ).toBeInTheDocument();
  });

  it('shows each series for the focused day in the tooltip, formatted', async () => {
    render(
      <TrendChart
        days={days}
        series={[
          { key: 'current', label: 'This period', values: [1, 2, 3] },
          { key: 'previous', label: 'Previous period', values: [2, 2, 1] },
        ]}
        ariaLabel="Spend against the previous period"
        formatValue={(value) => `$${value}`}
        formatDate={(day) => `day ${day.slice(8)}`}
      />,
    );
    const chart = screen.getByRole('img', { name: 'Spend against the previous period' });

    fireEvent.focus(chart);
    fireEvent.keyDown(chart, { key: 'ArrowRight' });

    const tooltip = (await screen.findByText('This period')).parentElement!.parentElement!;
    expect(tooltip).toHaveTextContent('day 02');
    expect(tooltip).toHaveTextContent('Previous period');
    expect(tooltip).toHaveTextContent('$2');
  });

  it('shows a single series in the tooltip with default formatting', async () => {
    render(
      <TrendChart
        days={days}
        series={[{ key: 'spend', label: 'Spend', values: [1, 2, 3] }]}
        ariaLabel="Estimated spend per day"
      />,
    );
    const chart = screen.getByRole('img', { name: 'Estimated spend per day' });

    fireEvent.focus(chart);
    fireEvent.keyDown(chart, { key: 'ArrowRight' });

    const tooltip = (await screen.findByText('Spend')).parentElement!.parentElement!;
    expect(tooltip).toHaveTextContent('2026-10-02');
    expect(tooltip).toHaveTextContent('2');
  });
});
