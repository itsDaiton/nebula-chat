import { CloseButton, Input, InputGroup } from '@chakra-ui/react';
import { useRef } from 'react';
import { LuSearch } from 'react-icons/lu';
import { useSettingsSearchStore } from '@/modules/settings/stores/useSettingsSearchStore';
import { resources } from '@/resources';

const { search } = resources.settings;

/** Filters the settings on the page as the user types; nothing is sent anywhere. */
export const SettingsSearch = () => {
  const { query, searchSettings, clearSearch } = useSettingsSearchStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const clear = () => {
    clearSearch();
    // The clear button unmounts with the query; keep focus in the search.
    inputRef.current?.focus();
  };

  return (
    <InputGroup
      startElement={<LuSearch />}
      endElement={query && <CloseButton size="xs" aria-label={search.clear} onClick={clear} />}
    >
      <Input
        ref={inputRef}
        type="search"
        aria-label={search.label}
        placeholder={search.placeholder}
        value={query}
        onChange={(event) => searchSettings(event.target.value)}
        // The custom clear button replaces the browser's own.
        css={{ '&::-webkit-search-cancel-button': { appearance: 'none' } }}
      />
    </InputGroup>
  );
};
