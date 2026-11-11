import { createFileRoute } from '@tanstack/react-router';
import { AdminLayout } from '@/modules/admin/components/AdminLayout';
import { requireTwoFactorAdmin } from '@/modules/admin/utils/adminGuard';

// The admin dashboard: only an Admin whose auth session passed 2FA gets in; the rest see not-found or are sent to Settings.
export const Route = createFileRoute('/_app/admin')({
  beforeLoad: ({ context }) => requireTwoFactorAdmin(context.queryClient),
  component: AdminLayout,
});
