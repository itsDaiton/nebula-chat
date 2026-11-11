import { Link } from '@tanstack/react-router';
import { resources } from '@/resources';
import type { AdminNavItemProps } from '@/modules/admin/types/types';
import { cn } from '@/shared/utils/cn';

const row =
  'flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-[13px] [&_svg]:size-4 [&_svg]:shrink-0';

/** One admin page; a page that is not built yet is a quiet, disabled "soon" row. */
export const AdminNavItem = ({ page, onNavigate }: AdminNavItemProps) => {
  const Icon = page.icon;

  if (!page.to) {
    return (
      <div aria-disabled="true" className={cn(row, 'text-faint')}>
        <Icon />
        <span className="flex-1">{page.label}</span>
        <span className="font-mono text-[10.5px]">{resources.admin.nav.soon}</span>
      </div>
    );
  }

  return (
    <Link
      to={page.to}
      onClick={onNavigate}
      className={cn(
        row,
        'text-foreground-secondary hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none [&_svg]:text-muted-foreground',
      )}
      activeProps={{ className: 'bg-hover text-foreground' }}
    >
      <Icon />
      {page.label}
    </Link>
  );
};
