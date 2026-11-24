import { createFileRoute } from '@tanstack/react-router';
import { RunsPage } from '@/modules/admin/components/RunsPage';
import { runsSearchSchema } from '@/modules/admin/utils/runsSearch';
import { usePanelStore } from '@/shared/stores/usePanelStore';

export const Route = createFileRoute('/_app/admin/runs')({
  validateSearch: runsSearchSchema,
  // A link that names a Run opens it even if the panel was left closed.
  onEnter: ({ search }) => {
    if (search.selected) usePanelStore.getState().openRight();
  },
  component: RunsPage,
});
