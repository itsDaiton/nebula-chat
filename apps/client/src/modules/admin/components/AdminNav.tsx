import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';
import { AdminNavItem } from '@/modules/admin/components/AdminNavItem';
import type { AdminNavProps } from '@/modules/admin/types/types';
import { adminNavigation } from '@/modules/admin/utils/adminNavigation';
import { resources } from '@/resources';

/** The left panel of the admin dashboard: the way back to chat, then every admin page. */
export const AdminNav = ({ onNavigate }: AdminNavProps) => (
  <nav
    aria-label={resources.admin.nav.label}
    className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto p-2"
  >
    <Link
      to="/"
      onClick={onNavigate}
      className="flex h-8 items-center gap-2.5 rounded-lg px-2 text-[13px] text-foreground hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none [&_svg]:size-4 [&_svg]:text-muted-foreground"
    >
      <ArrowLeftIcon />
      {resources.admin.nav.back}
    </Link>
    {adminNavigation.map((group) => (
      <div key={group.label} className="flex flex-col gap-px">
        <h2 className="px-2 pt-4 pb-1.5 text-[11.5px] font-medium text-muted-foreground">
          {group.label}
        </h2>
        {group.pages.map((page) => (
          <AdminNavItem key={page.id} page={page} onNavigate={onNavigate} />
        ))}
      </div>
    ))}
  </nav>
);
