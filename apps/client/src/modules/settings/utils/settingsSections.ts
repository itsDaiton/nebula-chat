import { ArchiveIcon, KeyRoundIcon, LockIcon, MonitorIcon, UserIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SettingsSectionId } from '@/modules/settings/types/types';
import { resources } from '@/resources';

const { sections } = resources.settings;

/** The dialog's nav, in order; a Guest only has the sections that apply to them. */
export const SETTINGS_SECTIONS = [
  { id: 'profile', label: sections.profile, icon: UserIcon, guest: false },
  { id: 'security', label: sections.security, icon: LockIcon, guest: false },
  { id: 'archived', label: sections.archived, icon: ArchiveIcon, guest: false },
  { id: 'appearance', label: sections.appearance, icon: MonitorIcon, guest: true },
  { id: 'account', label: sections.account, icon: KeyRoundIcon, guest: false },
] satisfies { id: SettingsSectionId; label: string; icon: LucideIcon; guest: boolean }[];
