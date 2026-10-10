import { CloseButton, Input, InputGroup } from '@chakra-ui/react';
import { LuSearch } from 'react-icons/lu';
import { useSettingsSearchStore } from '@/modules/settings/stores/useSettingsSearchStore';
import { resources } from '@/resources';

const { search } = resources.settings;

/** Filters the settings on the page as the user types; nothing is sent anywhere. */
export const SettingsSearch = () => {
  const { query, searchSettings, clearSearch } = useSettingsSearchStore();

  return (
    <InputGroup
      startElement={<LuSearch />}
      endElement={
        query && <CloseButton size="xs" aria-label={search.clear} onClick={clearSearch} />
      }
    >
      <Input
        type="search"
        aria-label={search.label}
        placeholder={search.placeholder}
        value={query}
        onChange={(event) => searchSettings(event.target.value)}
      />
    </InputGroup>
  );
};
