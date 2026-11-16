import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';
import { cn } from '@/shared/utils/cn';

const Avatar = ({ className, ...props }: AvatarPrimitive.Root.Props) => (
  <AvatarPrimitive.Root
    data-slot="avatar"
    className={cn(
      'relative flex size-8 shrink-0 select-none items-center justify-center overflow-hidden rounded-full border border-border bg-raised',
      className,
    )}
    {...props}
  />
);

const AvatarImage = ({ className, ...props }: AvatarPrimitive.Image.Props) => (
  <AvatarPrimitive.Image
    data-slot="avatar-image"
    className={cn('size-full object-cover', className)}
    {...props}
  />
);

const AvatarFallback = ({ className, ...props }: AvatarPrimitive.Fallback.Props) => (
  <AvatarPrimitive.Fallback
    data-slot="avatar-fallback"
    className={cn(
      'flex size-full items-center justify-center text-xs font-medium text-foreground-secondary',
      className,
    )}
    {...props}
  />
);

export { Avatar, AvatarImage, AvatarFallback };
