import { Avatar } from '@chakra-ui/react';
import type { UserAvatarProps } from '@/modules/auth/types/types';

/** A Registered user's Avatar: their Profile image, with their initials beneath for a URL that fails to load. */
export const UserAvatar = ({ name, image, size = 'sm' }: UserAvatarProps) => (
  <Avatar.Root size={size}>
    <Avatar.Fallback name={name} />
    {image && <Avatar.Image src={image} alt={name} />}
  </Avatar.Root>
);
