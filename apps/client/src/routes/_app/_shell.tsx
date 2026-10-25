import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/shared/components/layout/AppShell';

// The header and three panels around the chat and Settings. Pathless, so it adds no segment to any URL.
export const Route = createFileRoute('/_app/_shell')({
  component: AppShell,
});
