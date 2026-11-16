import { createFileRoute } from '@tanstack/react-router';
import { SessionTranscriptPage } from '@/modules/admin/components/SessionTranscriptPage';
import { sessionsSearchSchema } from '@/modules/admin/utils/sessionsSearch';
import { usePanelStore } from '@/shared/stores/usePanelStore';

// Not nested under the table, so the table is off this page while the shared search keeps its state.
// Named `sessionId`, not `id`: the shell header reads `id` as a chat Session the viewer owns.
export const Route = createFileRoute('/_app/admin/sessions_/$sessionId')({
  validateSearch: sessionsSearchSchema,
  onEnter: () => usePanelStore.getState().openRight(),
  component: SessionTranscriptPage,
});
