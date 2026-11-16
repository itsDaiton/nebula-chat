import type { PaletteAction } from '@/modules/commandPalette/types/types';

export const matchesQuery = (action: PaletteAction, query: string) => {
  const needle = query.trim().toLowerCase();
  return [action.label, action.group, ...(action.keywords ?? [])]
    .join(' ')
    .toLowerCase()
    .includes(needle);
};
