import { Outlet, createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/shared/components/layout/AppShell';

// The chat layout: the shell frames `/` and `/s/$id`. Pathless, so it adds no segment to any URL.
export const Route = createFileRoute('/_app/_chat')({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
