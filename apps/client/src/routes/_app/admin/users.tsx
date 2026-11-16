import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { ListUsersOrder } from '@/libs/api/generated/model/listUsersOrder';
import { ListUsersSortBy } from '@/libs/api/generated/model/listUsersSortBy';
import { ListUsersStatusItem } from '@/libs/api/generated/model/listUsersStatusItem';
import { UsersPage } from '@/modules/admin/components/UsersPage';
import { optionalSearchText } from '@/routing/searchParams';
import { usePanelStore } from '@/shared/stores/usePanelStore';

const searchSchema = z.object({
  q: optionalSearchText(),
  status: z.array(z.enum(ListUsersStatusItem)).optional().catch(undefined),
  sort: z.enum(ListUsersSortBy).optional().catch(undefined),
  dir: z.enum(ListUsersOrder).optional().catch(undefined),
  cursor: z.uuid().optional().catch(undefined),
  selected: z.uuid().optional().catch(undefined),
});

export const Route = createFileRoute('/_app/admin/users')({
  validateSearch: searchSchema,
  // A link that names a User opens their detail even if the panel was left closed.
  onEnter: ({ search }) => {
    if (search.selected) usePanelStore.getState().openRight();
  },
  component: UsersPage,
});
