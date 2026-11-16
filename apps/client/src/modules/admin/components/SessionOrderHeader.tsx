import { getRouteApi } from '@tanstack/react-router';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { DEFAULT_SESSION_ORDER } from '@/modules/admin/utils/sessionQueryOptions';
import { resources } from '@/resources';

const route = getRouteApi('/_app/admin/sessions');
const text = resources.admin.sessions;

/** Last activity is the only order the API offers: a click reverses it. */
export const SessionOrderHeader = () => {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const direction = search.dir ?? DEFAULT_SESSION_ORDER;
  const Icon = direction === 'asc' ? ChevronUpIcon : ChevronDownIcon;

  return (
    <button
      type="button"
      aria-label={text.sort(text.columns.lastActivity, direction)}
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
      {text.columns.lastActivity}
      <Icon className="size-3" />
    </button>
  );
};
