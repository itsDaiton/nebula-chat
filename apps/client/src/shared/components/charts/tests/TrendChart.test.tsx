import { render, screen } from '@testing-library/react';
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
});
