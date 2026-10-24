import userEvent from '@testing-library/user-event';

/**
 * Picks an open Chakra (Zag) menu item by keyboard, arrow down then Enter: jsdom puts every pointer event at (0, 0),
 * so once the modality leaves `pointer` a click selects nothing.
 */
export const selectMenuItem = async (item: HTMLElement) => {
  const itemCount =
    item.closest('[role="menu"]')?.querySelectorAll('[role="menuitem"]').length ?? 0;
  for (let step = 0; step < itemCount && !item.hasAttribute('data-highlighted'); step += 1) {
    await userEvent.keyboard('{ArrowDown}');
  }
  await userEvent.keyboard('{Enter}');
};
