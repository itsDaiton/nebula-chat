import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { NebulaButton } from '@/shared/components/navigation/NebulaButton';
import { renderWithChakra } from '@/test/render';

describe('NebulaButton', () => {
  it('renders its label as a button', () => {
    renderWithChakra(<NebulaButton>Click me</NebulaButton>);

    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('forwards the click handler', async () => {
    const onClick = vi.fn();
    renderWithChakra(<NebulaButton onClick={onClick}>Click me</NebulaButton>);

    await userEvent.click(screen.getByRole('button', { name: 'Click me' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('forwards the disabled state and blocks clicks', async () => {
    const onClick = vi.fn();
    renderWithChakra(
      <NebulaButton disabled onClick={onClick}>
        Click me
      </NebulaButton>,
    );

    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
