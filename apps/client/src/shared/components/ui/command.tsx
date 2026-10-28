import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { cn } from '@/shared/utils/cn';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { SearchIcon, CheckIcon } from 'lucide-react';
import { resources } from '@/resources';

const Command = ({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) => (
  <CommandPrimitive
    data-slot="command"
    className={cn(
      'flex size-full flex-col overflow-hidden rounded-xl! bg-popover p-1 text-popover-foreground',
      className,
    )}
    {...props}
  />
);

const CommandDialog = ({
  title = resources.ui.commandPalette.title,
  description = resources.ui.commandPalette.description,
  children,
  className,
  showCloseButton = false,
  finalFocus,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, 'children'> & {
  /** Where focus lands on close; the dialog has no trigger to return it to. */
  finalFocus?: React.ComponentProps<typeof DialogContent>['finalFocus'];
  title?: string;
  description?: string;
  className?: string;
  showCloseButton?: boolean;
  children: React.ReactNode;
}) => (
  <Dialog {...props}>
    <DialogContent
      className={cn('top-1/3 translate-y-0 overflow-hidden rounded-xl! p-0', className)}
      showCloseButton={showCloseButton}
      finalFocus={finalFocus}
    >
      {/* Inside the popup, so Base UI names the dialog by them. */}
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {children}
    </DialogContent>
  </Dialog>
);

const CommandInput = ({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) => (
  <div
    data-slot="command-input-wrapper"
    className="flex h-11 items-center gap-2.5 border-b border-border px-3.5"
  >
    <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
    <CommandPrimitive.Input
      data-slot="command-input"
      className={cn(
        'w-full bg-transparent text-[13.5px] outline-hidden placeholder:text-faint disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  </div>
);

const CommandList = ({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) => (
  <CommandPrimitive.List
    data-slot="command-list"
    className={cn(
      'no-scrollbar max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none',
      className,
    )}
    {...props}
  />
);

const CommandEmpty = ({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) => (
  <CommandPrimitive.Empty
    data-slot="command-empty"
    className={cn('py-6 text-center text-sm', className)}
    {...props}
  />
);

const CommandGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) => (
  <CommandPrimitive.Group
    data-slot="command-group"
    className={cn(
      'overflow-hidden p-1 text-foreground **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground',
      className,
    )}
    {...props}
  />
);

const CommandSeparator = ({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) => (
  <CommandPrimitive.Separator
    data-slot="command-separator"
    className={cn('-mx-1 h-px bg-border', className)}
    {...props}
  />
);

const CommandItem = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) => (
  <CommandPrimitive.Item
    data-slot="command-item"
    className={cn(
      "group/command-item relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none in-data-[slot=dialog-content]:rounded-lg! data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-hover data-[selected=true]:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[selected=true]:*:[svg]:text-foreground",
      className,
    )}
    {...props}
  >
    {children}
    <CheckIcon className="ml-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100" />
  </CommandPrimitive.Item>
);

const CommandShortcut = ({ className, ...props }: React.ComponentProps<'span'>) => (
  <span
    data-slot="command-shortcut"
    className={cn(
      'ml-auto text-xs tracking-widest text-muted-foreground group-data-[selected=true]/command-item:text-foreground',
      className,
    )}
    {...props}
  />
);

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
