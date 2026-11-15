import { SearchIcon } from 'lucide-react';
import { useRef } from 'react';
import type { UserSearchInputProps } from '@/modules/admin/types/types';
import { resources } from '@/resources';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/shared/components/ui/input-group';
import { useOnUnmount } from '@/shared/hooks/useOnUnmount';

const SEARCH_DEBOUNCE_MS = 300;
const text = resources.admin.users;

// Module-level timer, outside React: the page has one search box.
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

/** The name-or-email search: what is typed reaches `onChange` once typing pauses. */
export const UserSearchInput = ({ value, onChange }: UserSearchInputProps) => {
  // A search still waiting when the page is left would navigate back to it.
  const cancelOnUnmount = useOnUnmount(() => clearTimeout(debounceTimer));
  // A value this box did not send (Back, a link) remounts the input so it shows the URL's text.
  const sent = useRef(value);
  const generation = useRef(0);
  if (value !== sent.current) {
    sent.current = value;
    generation.current += 1;
  }

  return (
    <InputGroup ref={cancelOnUnmount} className="h-[30px] w-[260px] border-border-strong">
      <InputGroupAddon>
        <SearchIcon className="size-3.5" />
      </InputGroupAddon>
      <InputGroupInput
        key={generation.current}
        type="search"
        aria-label={text.search}
        placeholder={text.searchPlaceholder}
        defaultValue={value}
        className="h-full text-[13px] md:text-[13px]"
        onChange={(event) => {
          const typed = event.target.value.trim() || undefined;
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            sent.current = typed;
            onChange(typed);
          }, SEARCH_DEBOUNCE_MS);
        }}
      />
    </InputGroup>
  );
};
