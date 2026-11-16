import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { renderWithProviders } from '@/test/render';

describe('Tabs', () => {
  it('moves between tabs with the arrow keys and shows the selected panel', async () => {
    renderWithProviders(
      <Tabs defaultValue="session">
        <TabsList variant="line">
          <TabsTrigger value="session">Session</TabsTrigger>
          <TabsTrigger value="run">Run</TabsTrigger>
        </TabsList>
        <TabsContent value="session">Session details</TabsContent>
        <TabsContent value="run">Run details</TabsContent>
      </Tabs>,
    );

    expect(screen.getByRole('tab', { name: 'Session' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Session details');

    await userEvent.click(screen.getByRole('tab', { name: 'Session' }));
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.keyboard('{Enter}');

    expect(screen.getByRole('tab', { name: 'Run' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Run details');
  });
});
