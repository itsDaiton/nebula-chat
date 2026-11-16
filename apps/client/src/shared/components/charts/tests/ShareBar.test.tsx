import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShareBar } from '@/shared/components/charts/ShareBar';

describe('ShareBar', () => {
  it('fills the track to the share and clamps it to the track', () => {
    const { container, rerender } = render(<ShareBar share={0.25} />);
    const fill = () => container.querySelector<HTMLElement>('div > div > div')!;

    expect(fill().style.width).toBe('25%');

    rerender(<ShareBar share={3} />);
    expect(fill().style.width).toBe('100%');
  });
});
