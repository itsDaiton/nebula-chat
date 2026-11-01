import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSettingsDialogStore } from '@/modules/settings/stores/useSettingsDialogStore';
import { resources } from '@/resources';
import { APPEARANCE_STORAGE_KEY, useAppearanceStore } from '@/shared/stores/useAppearanceStore';
import { holdSession } from '@/test/auth';
import { serveChatPage } from '@/test/chat';
import { renderRoute } from '@/test/renderRoute';

const { theme, font } = resources.settings.appearance;

beforeEach(() => {
  serveChatPage();
  localStorage.clear();
  useAppearanceStore.setState({ font: 'geist' });
  useSettingsDialogStore.setState({ isOpen: true, section: 'appearance' });
});

describe('AppearanceSetting', () => {
  it('applies the theme at once', async () => {
    await holdSession({ isAnonymous: false });
    await renderRoute('/');

    await userEvent.click(await screen.findByRole('radio', { name: new RegExp(theme.dark) }));

    expect(screen.getByRole('radio', { name: new RegExp(theme.dark) })).toBeChecked();
    expect(document.documentElement).toHaveClass('dark');
  });

  it('switches the interface font and remembers it', async () => {
    await holdSession({ isAnonymous: false });
    await renderRoute('/');

    const fonts = await screen.findByRole('radiogroup', { name: font.label });
    await userEvent.click(within(fonts).getByRole('radio', { name: font.system }));

    expect(document.documentElement.dataset.font).toBe('system');
    expect(localStorage.getItem(APPEARANCE_STORAGE_KEY)).toContain('"system"');
  });

  it('is all a Guest sees of Settings', async () => {
    await holdSession({ isAnonymous: true });
    useSettingsDialogStore.setState({ section: 'security' });
    await renderRoute('/');

    const nav = await screen.findByRole('navigation', { name: resources.settings.nav });
    expect(nav).toHaveTextContent(resources.settings.sections.appearance);
    expect(nav).not.toHaveTextContent(resources.settings.sections.security);
    expect(screen.getByRole('radiogroup', { name: theme.label })).toBeInTheDocument();
  });
});
