import { Avatar } from '@chakra-ui/react';
import { LuUserRound } from 'react-icons/lu';
import type { UserAvatarProps } from '@/modules/auth/types/types';

/**
 * A User's Avatar. A Registered user's is their Profile image, with their initials beneath for a URL
 * that fails to load; without a name (a Guest) it is a generic person, never initials or an image.
 */
export const UserAvatar = ({ name, image, size = 'sm' }: UserAvatarProps) => (
  <Avatar.Root size={size}>
    {name ? (
      <Avatar.Fallback name={name} />
    ) : (
      <Avatar.Fallback>
        <LuUserRound />
      </Avatar.Fallback>
    )}
    {name && image && <Avatar.Image src={image} alt={name} />}
  </Avatar.Root>
);
