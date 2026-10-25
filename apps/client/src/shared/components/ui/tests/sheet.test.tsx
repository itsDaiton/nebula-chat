import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Button } from '@/shared/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/ui/sheet';
import { resources } from '@/resources';
import { renderWithProviders } from '@/test/render';

describe('Sheet', () => {
  it('slides in a labelled dialog and closes from its close button', async () => {
    renderWithProviders(
      <Sheet>
        <SheetTrigger render={<Button />}>Sessions</SheetTrigger>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Sessions</SheetTitle>
            <SheetDescription>Your recent chats</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <SheetClose render={<Button />}>Done</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Sessions' }));
    expect(await screen.findByRole('dialog', { name: 'Sessions' })).toHaveAccessibleDescription(
      'Your recent chats',
    );

    await userEvent.click(screen.getByRole('button', { name: resources.ui.close }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
