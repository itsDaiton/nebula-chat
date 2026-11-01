import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { useSettingsDialogStore } from '@/modules/settings/stores/useSettingsDialogStore';

const searchSchema = z.object({
  section: z
    .enum(['profile', 'security', 'archived', 'appearance', 'account'])
    .optional()
    .catch(undefined),
});

// Settings is a dialog, not a page: an old link lands on `/` with the dialog open, on `?section=` if given.
export const Route = createFileRoute('/_app/settings')({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    useSettingsDialogStore.getState().openSettings(search.section);
    throw redirect({ to: '/', replace: true });
  },
});
