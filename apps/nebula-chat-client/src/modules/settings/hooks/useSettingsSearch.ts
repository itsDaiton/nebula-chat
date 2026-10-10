import { useSettingsSearchStore } from '@/modules/settings/stores/useSettingsSearchStore';
import type { SettingsEntryId, SettingsSectionId } from '@/modules/settings/types/types';
import { SETTINGS_INDEX, matchesSettingsQuery } from '@/modules/settings/utils/settingsIndex';

const ENTRY_IDS = Object.keys(SETTINGS_INDEX) as SettingsEntryId[];

/** Which settings rows and sections the current search leaves on the page. */
export const useSettingsSearch = () => {
  const { query } = useSettingsSearchStore();
  const visible = new Set(
    ENTRY_IDS.filter((id) => matchesSettingsQuery(SETTINGS_INDEX[id], query)),
  );

  return {
    isEntryVisible: (id: SettingsEntryId) => visible.has(id),
    isSectionVisible: (section: SettingsSectionId) =>
      ENTRY_IDS.some((id) => visible.has(id) && SETTINGS_INDEX[id].section === section),
    hasMatches: visible.size > 0,
  };
};
