import type {
  SettingsEntry,
  SettingsEntryId,
  SettingsSectionId,
} from '@/modules/settings/types/types';
import { resources } from '@/resources';

const { profile, security, changePassword, account } = resources.settings;

export const SETTINGS_SECTION_TITLES: Record<SettingsSectionId, string> = {
  profile: profile.title,
  security: security.title,
  account: account.title,
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
  signOutEverywhere: {
    section: 'account',
    label: account.signOutEverywhere.label,
    description: account.signOutEverywhere.description,
    keywords: ['log out', 'logout', 'sessions', 'other devices'],
  },
  deleteAccount: {
    section: 'account',
    label: account.deleteAccount.label,
    description: account.deleteAccount.description,
    keywords: ['remove', 'close account', 'erase'],
  },
  accountId: {
    section: 'account',
    label: account.accountId.label,
    description: account.accountId.description,
    keywords: ['user id', 'identifier', 'support'],
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

/** The Account page's sections, in page order. */
export const SETTINGS_SECTION_IDS = Object.keys(SETTINGS_SECTION_TITLES) as SettingsSectionId[];

const SETTINGS_ENTRY_IDS = Object.keys(SETTINGS_INDEX) as SettingsEntryId[];

/** The rows of one section, in page order. */
export const settingsEntriesIn = (section: SettingsSectionId) =>
  SETTINGS_ENTRY_IDS.filter((id) => SETTINGS_INDEX[id].section === section);
