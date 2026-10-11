import { IconButton, Menu, Portal } from '@chakra-ui/react';
import { UserAvatar } from '@/modules/auth/components/UserAvatar';
import type { UserMenuProps } from '@/modules/auth/types/types';
import { resources } from '@/resources';

/** A User's Avatar button and the menu it opens; the caller supplies the heading and items. */
export const UserMenu = ({ name, image, children }: UserMenuProps) => (
  <Menu.Root positioning={{ placement: 'bottom-end' }} lazyMount unmountOnExit>
    <Menu.Trigger asChild>
      <IconButton aria-label={resources.userMenu.label} variant="ghost" size="sm" rounded="full">
        <UserAvatar name={name} image={image} />
      </IconButton>
    </Menu.Trigger>
    <Portal>
      <Menu.Positioner>
        <Menu.Content minW="56">{children}</Menu.Content>
      </Menu.Positioner>
    </Portal>
  </Menu.Root>
);
