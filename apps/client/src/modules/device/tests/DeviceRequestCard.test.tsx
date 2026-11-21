import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeviceRequestCard } from '@/modules/device/components/DeviceRequestCard';
import type { DeviceDecision } from '@/modules/device/types/types';
import { resources } from '@/resources';
import { renderWithProviders } from '@/test/render';

const { device } = resources;

const renderCard = (deciding?: DeviceDecision) =>
  renderWithProviders(
    <DeviceRequestCard
      request={{ user_code: 'WDJBMJHT', status: 'pending', client_id: 'nebula-cli' }}
      secondsLeft={300}
      isDeciding={deciding !== undefined}
      deciding={deciding}
      hasFailed={false}
      onDecide={vi.fn()}
    />,
  );

describe('DeviceRequestCard', () => {
  it('spins only the decision being sent and disables the other', () => {
    renderCard('approve');

    const approve = screen.getByRole('button', { name: device.approving });
    const deny = screen.getByRole('button', { name: device.deny });
    expect(approve).toHaveAttribute('aria-busy', 'true');
    expect(deny).toBeDisabled();
    expect(deny).not.toHaveAttribute('aria-busy');
  });

  it('leaves both buttons idle when nothing is being decided', () => {
    renderCard();

    expect(screen.getByRole('button', { name: device.approve })).toBeEnabled();
    expect(screen.getByRole('button', { name: device.deny })).toBeEnabled();
  });
});
