import { act, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { describe, expect, it } from 'vitest';
import { Toaster } from '@/shared/components/ui/sonner';
import { renderWithProviders } from '@/test/render';

describe('Toaster', () => {
  it('announces a toast in a polite live region', async () => {
    renderWithProviders(<Toaster />);

    act(() => {
      toast.success('Session archived');
    });

    const message = await screen.findByText('Session archived');
    expect(message.closest('[aria-live]')).toHaveAttribute('aria-live', 'polite');
  });
});
