import * as React from 'react';
import { cn } from '@/shared/utils/cn';

const PromptInput = ({ className, ...props }: React.ComponentProps<'form'>) => (
  <form
    data-slot="prompt-input"
    className={cn(
      'flex flex-col rounded-[18px] border border-border-strong bg-raised pt-3 pr-3 pb-2.5 pl-4 transition-colors focus-within:border-muted-foreground',
      className,
    )}
    {...props}
  />
);

const PromptInputTextarea = ({ className, ref, ...props }: React.ComponentProps<'textarea'>) => (
  <textarea
    ref={ref}
    data-slot="prompt-input-textarea"
    rows={1}
    className={cn(
      'max-h-[200px] min-h-11 w-full resize-none bg-transparent pt-0.5 text-[14px] text-foreground outline-none placeholder:text-faint disabled:cursor-not-allowed disabled:opacity-70',
      className,
    )}
    {...props}
  />
);

const PromptInputActions = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div
    data-slot="prompt-input-actions"
    className={cn('mt-1.5 -ml-1.5 flex items-center gap-1.5', className)}
    {...props}
  />
);

export { PromptInput, PromptInputTextarea, PromptInputActions };
