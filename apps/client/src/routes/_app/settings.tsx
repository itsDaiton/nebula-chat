import { createFileRoute, redirect } from '@tanstack/react-router';
import { useSettingsDialogStore } from '@/modules/settings/stores/useSettingsDialogStore';

// Settings is a dialog, not a page: an old link lands on `/` with the dialog open.
export const Route = createFileRoute('/_app/settings')({
  beforeLoad: () => {
    useSettingsDialogStore.getState().openSettings();
    throw redirect({ to: '/', replace: true });
  },
});
