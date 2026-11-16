import type { AdminPageTitleProps } from '@/modules/admin/types/types';

// One heading for every admin page, sized to the mockups; pages must not restyle it.
export const AdminPageTitle = ({ children }: AdminPageTitleProps) => (
  <h1 className="px-5 pt-4 pb-3 text-lg font-semibold tracking-[-0.02em]">{children}</h1>
);
