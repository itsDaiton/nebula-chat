import { Link } from '@tanstack/react-router';
import type { AdminNavItemProps } from '@/modules/admin/types/types';
import { cn } from '@/shared/utils/cn';

const row =
  'flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-[13px] [&_svg]:size-4 [&_svg]:shrink-0';

/** One admin page in the navigation. */
export const AdminNavItem = ({ page, onNavigate }: AdminNavItemProps) => {
  const Icon = page.icon;

  return (
    <Link
      to={page.to}
      onClick={onNavigate}
      // `/admin` prefixes every admin path, so only an exact match marks the Overview.
      activeOptions={{ exact: page.to === '/admin' }}
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
