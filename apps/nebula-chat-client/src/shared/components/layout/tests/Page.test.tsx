import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Page } from '@/shared/components/layout/Page';
import { renderWithChakra } from '@/test/render';

describe('Page', () => {
  it('renders its children', () => {
    renderWithChakra(
      <Page>
        <p>page body</p>
      </Page>,
    );

    expect(screen.getByText('page body')).toBeInTheDocument();
  });

  it('forwards a ref to the container', () => {
    const ref = { current: null } as React.RefObject<HTMLDivElement | null>;

    renderWithChakra(<Page ref={ref}>body</Page>);

    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
