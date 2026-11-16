import { createFileRoute } from '@tanstack/react-router';
import { SessionTranscriptPage } from '@/modules/admin/components/SessionTranscriptPage';
import { sessionsSearchSchema } from '@/modules/admin/utils/sessionsSearch';
import { usePanelStore } from '@/shared/stores/usePanelStore';

// Not nested under the table: the trailing underscore keeps the table off this page, while the shared search keeps its state.
export const Route = createFileRoute('/_app/admin/sessions_/$id')({
  validateSearch: sessionsSearchSchema,
  onEnter: () => usePanelStore.getState().openRight(),
  component: SessionTranscriptPage,
});
