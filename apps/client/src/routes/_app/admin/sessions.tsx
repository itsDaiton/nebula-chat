import { createFileRoute } from '@tanstack/react-router';
import { SessionsPage } from '@/modules/admin/components/SessionsPage';
import { sessionsSearchSchema } from '@/modules/admin/utils/sessionsSearch';

export const Route = createFileRoute('/_app/admin/sessions')({
  validateSearch: sessionsSearchSchema,
  component: SessionsPage,
});
