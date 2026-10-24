import { LuUserRound } from 'react-icons/lu';
import type { SettingsSection } from '@/modules/settings/types/types';
import { resources } from '@/resources';

/** The settings navigation, in order; a section gets its own sub-route once there are two. */
export const SETTINGS_SECTIONS: SettingsSection[] = [
  { label: resources.settings.sections.account, icon: LuUserRound, path: '/settings' },
];
