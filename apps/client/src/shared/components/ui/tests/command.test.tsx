import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/shared/components/ui/command';
import { resources } from '@/resources';
import { renderWithProviders } from '@/test/render';

const palette = (onSelect = vi.fn()) => (
  <Command>
    <CommandInput placeholder="Search" />
    <CommandList>
      <CommandEmpty>No results</CommandEmpty>
      <CommandGroup heading="Actions">
        <CommandItem onSelect={onSelect}>
          New chat <CommandShortcut>⌘E</CommandShortcut>
        </CommandItem>
        <CommandSeparator />
        <CommandItem>Settings</CommandItem>
      </CommandGroup>
    </CommandList>
  </Command>
);

describe('Command', () => {
  it('filters as the user types and runs the highlighted item on Enter', async () => {
    const onSelect = vi.fn();
    renderWithProviders(palette(onSelect));

    await userEvent.type(screen.getByRole('combobox'), 'new');

    expect(screen.getByRole('option', { name: /New chat/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.queryByRole('option', { name: 'Settings' })).not.toBeInTheDocument();

    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('shows the empty state when nothing matches', async () => {
    renderWithProviders(palette());

    await userEvent.type(screen.getByRole('combobox'), 'zzz');

    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('opens as a dialog named by its title', () => {
    renderWithProviders(<CommandDialog open>{palette()}</CommandDialog>);

    expect(
      screen.getByRole('dialog', { name: resources.ui.commandPalette.title }),
    ).toHaveAccessibleDescription(resources.ui.commandPalette.description);
  });
});
