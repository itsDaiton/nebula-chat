import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Sparkline } from '@/shared/components/charts/Sparkline';

describe('Sparkline', () => {
  it('renders a labelled chart for its values', () => {
    render(<Sparkline values={[1, 3, 2, 5]} label="Messages sent, trend over the range" />);

    expect(
      screen.getByRole('img', { name: 'Messages sent, trend over the range' }),
    ).toBeInTheDocument();
  });

  it('renders a labelled chart when there is nothing to plot', () => {
    render(<Sparkline values={[]} label="Empty trend" />);

    expect(screen.getByRole('img', { name: 'Empty trend' })).toBeInTheDocument();
  });
});
