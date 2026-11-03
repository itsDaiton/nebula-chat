import { ChevronsUpDownIcon } from 'lucide-react';
import { useModelPickerStore } from '@/modules/chat/stores/useModelPickerStore';
import { useRegisterPaletteActions } from '@/modules/commandPalette/hooks/useRegisterPaletteActions';
import { resources } from '@/resources';
import { useKeyboardShortcut } from '@/shared/hooks/useKeyboardShortcut';

export const useChatPaletteActions = () => {
  const setPickerOpen = useModelPickerStore((state) => state.setOpen);
  useKeyboardShortcut('l', () => setPickerOpen(true), { ctrl: true, shift: true });

  useRegisterPaletteActions([
    {
      id: 'switch-model',
      group: resources.commandPalette.actions,
      label: resources.commandPalette.switchModel,
      keywords: ['model', 'gpt', 'claude', 'provider'],
      icon: <ChevronsUpDownIcon />,
      shortcut: ['⇧', 'L'],
      perform: () => setPickerOpen(true),
    },
  ]);
};
