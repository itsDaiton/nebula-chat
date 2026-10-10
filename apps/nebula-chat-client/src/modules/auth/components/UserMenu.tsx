import { Avatar, IconButton, Menu, Portal } from '@chakra-ui/react';
import type { UserMenuProps } from '@/modules/auth/types/types';
import { resources } from '@/resources';

/** A Registered user's Avatar button and the menu it opens; the caller supplies the heading and items. */
export const UserMenu = ({ name, children }: UserMenuProps) => (
  <Menu.Root positioning={{ placement: 'bottom-end' }} lazyMount unmountOnExit>
    <Menu.Trigger asChild>
      <IconButton aria-label={resources.userMenu.label} variant="ghost" size="sm" rounded="full">
        <Avatar.Root size="sm">
          {/* Avatar.Image goes here once Profile images arrive. */}
          <Avatar.Fallback name={name} />
        </Avatar.Root>
      </IconButton>
    </Menu.Trigger>
    <Portal>
      <Menu.Positioner>
        <Menu.Content minW="56">{children}</Menu.Content>
      </Menu.Positioner>
    </Portal>
  </Menu.Root>
);
