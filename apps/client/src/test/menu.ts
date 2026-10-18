import userEvent from '@testing-library/user-event';

/**
 * Picks an item in an open Chakra (Zag) menu the way a keyboard user does: arrow down to it, then
 * Enter.
 *
 * Not with a click: Zag selects only the highlighted item, and highlights on pointermove only
 * while its global interaction modality is `pointer`, ignoring a move that lands where the last
 * one did. jsdom puts every pointer event at (0, 0), so once a key press or programmatic focus
 * (in this test or an earlier one) switches the modality, a click selects nothing.
 */
export const selectMenuItem = async (item: HTMLElement) => {
  const itemCount =
    item.closest('[role="menu"]')?.querySelectorAll('[role="menuitem"]').length ?? 0;
  for (let step = 0; step < itemCount && !item.hasAttribute('data-highlighted'); step += 1) {
    await userEvent.keyboard('{ArrowDown}');
  }
  await userEvent.keyboard('{Enter}');
};
