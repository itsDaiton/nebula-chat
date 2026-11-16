import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSettingsDialogStore } from '@/modules/settings/stores/useSettingsDialogStore';
import { resources } from '@/resources';
import { APPEARANCE_STORAGE_KEY, useAppearanceStore } from '@/shared/stores/useAppearanceStore';
import { holdSession } from '@/test/auth';
import { serveChatPage } from '@/test/chat';
import { renderRoute } from '@/test/renderRoute';

const { theme, font, responseFont, textSize, width, motion } = resources.settings.appearance;

beforeEach(() => {
  serveChatPage();
  localStorage.clear();
  useAppearanceStore.setState({
    font: 'geist',
    responseFont: 'match',
    transcriptSize: 'medium',
    transcriptWidth: 'narrow',
    motion: 'system',
  });
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

  it('keeps the theme description as it is while the theme changes', async () => {
    await holdSession({ isAnonymous: false });
    await renderRoute('/');

    await userEvent.click(await screen.findByRole('radio', { name: new RegExp(theme.dark) }));

    expect(screen.getByText(theme.description)).toBeInTheDocument();
  });

  it('applies the conversation options at once and remembers them', async () => {
    await holdSession({ isAnonymous: false });
    await renderRoute('/');
    const choose = async (group: string, name: string) =>
      userEvent.click(
        within(await screen.findByRole('radiogroup', { name: group })).getByRole('radio', { name }),
      );

    await choose(responseFont.label, responseFont.system);
    await choose(textSize.label, textSize.large);
    await choose(width.label, width.wide);
    await choose(motion.label, motion.reduced);

    const { dataset } = document.documentElement;
    expect(dataset.responseFont).toBe('system');
    expect(dataset.transcriptSize).toBe('large');
    expect(dataset.transcriptWidth).toBe('wide');
    expect(dataset.motion).toBe('reduced');
    expect(localStorage.getItem(APPEARANCE_STORAGE_KEY)).toContain('"transcriptWidth":"wide"');
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
