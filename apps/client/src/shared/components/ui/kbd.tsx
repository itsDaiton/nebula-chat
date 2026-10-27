import { cn } from '@/shared/utils/cn';

const Kbd = ({ className, ...props }: React.ComponentProps<'kbd'>) => (
  <kbd
    data-slot="kbd"
    className={cn(
      "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm bg-muted px-1 font-mono text-xs font-medium text-muted-foreground select-none [&_svg:not([class*='size-'])]:size-3",
      className,
    )}
    {...props}
  />
);

const KbdGroup = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <kbd
    data-slot="kbd-group"
    className={cn('inline-flex items-center gap-1', className)}
    {...props}
  />
);

export { Kbd, KbdGroup };
