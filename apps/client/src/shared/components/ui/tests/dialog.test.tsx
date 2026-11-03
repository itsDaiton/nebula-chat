import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { resources } from '@/resources';
import { renderWithProviders } from '@/test/render';

const renderDialog = () =>
  renderWithProviders(
    <Dialog>
      <DialogTrigger render={<Button />}>Rename</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename session</DialogTitle>
          <DialogDescription>Give it a name you will find again.</DialogDescription>
        </DialogHeader>
        <input aria-label="Name" />
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>,
  );

describe('Dialog', () => {
  it('opens a labelled modal from its trigger and closes on Escape', async () => {
    renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Rename' }));

    const dialog = await screen.findByRole('dialog', { name: 'Rename session' });
    expect(dialog).toHaveAccessibleDescription('Give it a name you will find again.');

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rename' })).toHaveFocus();
  });

  it('keeps focus inside while open', async () => {
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Rename' }));
    const dialog = await screen.findByRole('dialog');

    // Past the last control a focus guard takes focus and hands it back inside.
    for (let i = 0; i < 4; i++) {
      await userEvent.tab();
      await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
    }
  });

  it.each(['Cancel', resources.ui.close])('closes from its %s button', async (name) => {
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Rename' }));
    await screen.findByRole('dialog');

    await userEvent.click(screen.getByRole('button', { name }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('offers a labelled close button in the footer', async () => {
    renderWithProviders(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Archived</DialogTitle>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>,
    );

    expect(await screen.findByRole('button', { name: resources.ui.close })).toBeInTheDocument();
  });
});
