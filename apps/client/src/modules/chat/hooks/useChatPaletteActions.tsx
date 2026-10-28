import { ChevronsUpDownIcon } from 'lucide-react';
import { useModelPickerStore } from '@/modules/chat/stores/useModelPickerStore';
import { useRegisterPaletteActions } from '@/modules/commandPalette/hooks/useRegisterPaletteActions';
import { resources } from '@/resources';

export const useChatPaletteActions = () => {
  const setPickerOpen = useModelPickerStore((state) => state.setOpen);

  useRegisterPaletteActions([
    {
      id: 'switch-model',
      group: resources.commandPalette.actions,
      label: resources.commandPalette.switchModel,
      keywords: ['model', 'gpt', 'claude', 'provider'],
      icon: <ChevronsUpDownIcon />,
      perform: () => setPickerOpen(true),
    },
  ]);
};
