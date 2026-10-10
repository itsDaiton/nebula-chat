import { useSettingsSearchStore } from '@/modules/settings/stores/useSettingsSearchStore';
import type { SettingsEntryId, SettingsSectionId } from '@/modules/settings/types/types';
import {
  SETTINGS_INDEX,
  SETTINGS_SECTION_IDS,
  matchesSettingsQuery,
  settingsEntriesIn,
} from '@/modules/settings/utils/settingsIndex';

/** Which settings rows and sections the current search leaves on the page. */
export const useSettingsSearch = () => {
  const { query } = useSettingsSearchStore();
  const isEntryVisible = (id: SettingsEntryId) => matchesSettingsQuery(SETTINGS_INDEX[id], query);
  const isSectionVisible = (section: SettingsSectionId) =>
    settingsEntriesIn(section).some(isEntryVisible);

  return {
    isEntryVisible,
    isSectionVisible,
    hasMatches: SETTINGS_SECTION_IDS.some(isSectionVisible),
  };
};
