import { getRouteApi } from '@tanstack/react-router';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { DEFAULT_AUDIT_ORDER } from '@/modules/admin/utils/auditQueryOptions';
import { resources } from '@/resources';

const route = getRouteApi('/_app/admin/audit');
const text = resources.admin.audit;

/** Time is the only order the API offers: a click reverses it and starts again from the first page. */
export const AuditOrderHeader = () => {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const direction = search.dir ?? DEFAULT_AUDIT_ORDER;
  const Icon = direction === 'asc' ? ChevronUpIcon : ChevronDownIcon;

  return (
    <button
      type="button"
      aria-label={text.sort(text.columns.time, direction)}
      className="flex w-full items-center gap-1 rounded-sm text-foreground-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      onClick={() =>
        void navigate({
          search: (previous) => ({
            ...previous,
            dir: direction === 'desc' ? 'asc' : 'desc',
            cursor: undefined,
          }),
        })
      }
    >
      {text.columns.time}
      <Icon className="size-3" />
    </button>
  );
};
