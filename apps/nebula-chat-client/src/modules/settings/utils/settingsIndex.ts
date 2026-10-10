import type {
  SettingsEntry,
  SettingsEntryId,
  SettingsSectionId,
} from '@/modules/settings/types/types';
import { resources } from '@/resources';

const { profile, security, changePassword } = resources.settings;

export const SETTINGS_SECTION_TITLES: Record<SettingsSectionId, string> = {
  profile: profile.title,
  security: security.title,
};

/** Every searchable setting on the Account page, keyed by the row that renders it. */
export const SETTINGS_INDEX: Record<SettingsEntryId, SettingsEntry> = {
  name: {
    section: 'profile',
    label: profile.name.label,
    keywords: ['name', 'display name', 'rename', 'profile'],
  },
  password: {
    section: 'security',
    label: changePassword.title,
    description: changePassword.description,
    keywords: ['change password', 'credentials', 'login', 'sign in', 'security'],
  },
};

/** Whether every word of `query` appears in the entry's copy, section title or keywords, ignoring case. */
export const matchesSettingsQuery = (entry: SettingsEntry, query: string) => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = [
    entry.label,
    entry.description ?? '',
    SETTINGS_SECTION_TITLES[entry.section],
    ...entry.keywords,
  ]
    .join(' ')
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
};
