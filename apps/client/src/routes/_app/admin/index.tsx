import { createFileRoute, redirect } from '@tanstack/react-router';

// The Overview is not built yet, so the dashboard opens on the Audit log.
export const Route = createFileRoute('/_app/admin/')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/audit', replace: true });
  },
});
