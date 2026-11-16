import { resources } from '@/resources';
import { Kbd, KbdGroup } from '@/shared/components/ui/kbd';
import { useOS } from '@/shared/hooks/useOS';
import type { NavigationRowProps } from '@/modules/sessions/types/types';
import { cn } from '@/shared/utils/cn';

const row =
  'flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-[13px] [&_svg]:size-4 [&_svg]:shrink-0';

/** One entry of the left panel's navigation; a row without a shortcut is a quiet "soon" placeholder. */
export const NavigationRow = ({ action, onClick }: NavigationRowProps) => {
  const modifier = resources.shell.modifier[useOS()];

  if (!action.shortcut) {
    return (
      <div aria-disabled="true" className={cn(row, 'text-faint')}>
        {action.icon}
        <span className="flex-1">{action.label}</span>
        <span className="font-mono text-[10.5px]">{resources.sidebar.soon}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        row,
        'text-foreground-secondary hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none [&_svg]:text-muted-foreground',
      )}
      onClick={onClick}
    >
      {action.icon}
      <span className="flex-1 text-left">{action.label}</span>
      <KbdGroup>
        <Kbd>{modifier}</Kbd>
        <Kbd>{action.shortcut}</Kbd>
      </KbdGroup>
    </button>
  );
};
