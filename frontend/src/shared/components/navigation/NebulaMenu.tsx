import type { NebulaMenuItemProps } from '@/shared/types/types';
import { IconButton, Menu, Portal } from '@chakra-ui/react';
import { LuSettings } from 'react-icons/lu';

export const NebulaMenu = ({ items }: { items: NebulaMenuItemProps[] }) => (
  <Menu.Root>
    <Menu.Trigger asChild>
      <IconButton aria-label="Settings" children={<LuSettings />} variant="ghost" size="md" />
    </Menu.Trigger>
    <Portal>
      <Menu.Positioner>
        <Menu.Content>
          {items.map((item) => (
            <Menu.Item key={item.value} value={item.value} onSelect={item.onClick}>
              {item.label}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Positioner>
    </Portal>
  </Menu.Root>
);
