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

const { profile, security, archived, appearance, account } = resources.settings;

/** What the search box looks through: each setting, the section it lives in and the words that find it. */
export const SETTINGS_INDEX = [
  { section: 'profile', label: profile.image.label, keywords: 'avatar photo picture' },
  { section: 'profile', label: profile.name.label, keywords: 'name display' },
  { section: 'security', label: resources.settings.changePassword.title, keywords: 'change' },
  {
    section: 'security',
    label: security.twoFactor.label,
    keywords: '2fa authenticator backup codes',
  },
  {
    section: 'security',
    label: security.signOutEverywhere.label,
    keywords: 'log out sessions devices',
  },
  { section: 'archived', label: archived.restore, keywords: 'archive restore sessions' },
  { section: 'appearance', label: appearance.theme.label, keywords: 'dark light mode color' },
  { section: 'appearance', label: appearance.font.label, keywords: 'geist typeface' },
  {
    section: 'appearance',
    label: appearance.responseFont.label,
    keywords: 'conversation typeface',
  },
  { section: 'appearance', label: appearance.textSize.label, keywords: 'font size scale' },
  { section: 'appearance', label: appearance.width.label, keywords: 'column layout' },
  { section: 'appearance', label: appearance.motion.label, keywords: 'animation reduce' },
  { section: 'account', label: account.accountId.label, keywords: 'support uuid' },
  {
    section: 'account',
    label: account.deleteAccount.label,
    keywords: 'remove close pending deletion',
  },
] satisfies { section: SettingsSectionId; label: string; keywords: string }[];
