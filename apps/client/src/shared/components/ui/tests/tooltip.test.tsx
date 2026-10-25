import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Button } from '@/shared/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { renderWithProviders } from '@/test/render';

describe('Tooltip', () => {
  it('shows its hint once the trigger has keyboard focus', async () => {
    renderWithProviders(
      <Tooltip>
        <TooltipTrigger render={<Button aria-label="New chat" />} />
        <TooltipContent>Start a new chat</TooltipContent>
      </Tooltip>,
    );

    expect(screen.queryByText('Start a new chat')).not.toBeInTheDocument();

    await userEvent.tab();

    expect(screen.getByRole('button', { name: 'New chat' })).toHaveFocus();
    expect(await screen.findByText('Start a new chat')).toBeVisible();
  });
});
