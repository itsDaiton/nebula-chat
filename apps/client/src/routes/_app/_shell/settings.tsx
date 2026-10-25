import { createFileRoute } from '@tanstack/react-router';
import { SettingsPage } from '@/modules/settings/SettingsPage';

export const Route = createFileRoute('/_app/_shell/settings')({
  component: SettingsPage,
});
