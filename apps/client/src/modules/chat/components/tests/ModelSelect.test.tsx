import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, delay, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getGetModelCatalogMockHandler } from '@/libs/api/generated/models/models.msw';
import { ModelSelect } from '@/modules/chat/components/ModelSelect';
import { useFavoriteModelsStore } from '@/modules/chat/stores/useFavoriteModelsStore';
import { useModelPickerStore } from '@/modules/chat/stores/useModelPickerStore';
import { resources } from '@/resources';
import { API_ROUTE, mockApiError } from '@/test/api';
import { server } from '@/test/msw';
import { renderWithProviders } from '@/test/render';

const renderPicker = (selectedModel = 'gpt-5', onModelChange = vi.fn()) => {
  renderWithProviders(<ModelSelect selectedModel={selectedModel} onModelChange={onModelChange} />);
  return onModelChange;
};

const openPicker = async (name: RegExp = /GPT-5/) =>
  userEvent.click(await screen.findByRole('button', { name }));

describe('ModelSelect', () => {
  beforeEach(() => {
    useModelPickerStore.setState({ isOpen: false, search: '' });
    localStorage.clear();
    useFavoriteModelsStore.setState({ favorites: [] });
  });

  it('shows the logo and label of the selected Model on the trigger', async () => {
    renderPicker('gpt-4.1-mini');

    const trigger = await screen.findByRole('button', { name: /GPT-4.1 mini/ });
    expect(within(trigger).getByRole('img', { name: 'OpenAI' })).toBeInTheDocument();
  });

  it('marks the trigger expanded while the picker is open', async () => {
    renderPicker('gpt-5');
    const trigger = await screen.findByRole('button', { name: /GPT-5/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows an id outside the catalog as itself', async () => {
    renderPicker('gpt-9');

    expect(await screen.findByRole('button', { name: /gpt-9/ })).toBeInTheDocument();
  });

  it("lists the catalog's Models by provider with label, id and context size", async () => {
    renderPicker();
    await openPicker();

    const openai = await screen.findByRole('group', { name: 'OpenAI' });
    expect(within(openai).getAllByRole('option')).toHaveLength(6);
    const mini = within(openai).getByRole('option', { name: /GPT-4.1 mini/ });
    expect(mini).toHaveTextContent('gpt-4.1-mini');
    expect(mini).toHaveTextContent('1M');
    expect(
      within(screen.getByRole('group', { name: 'Anthropic' })).getAllByRole('option'),
    ).toHaveLength(1);
  });

  it('lists only what the catalog serves', async () => {
    server.use(
      getGetModelCatalogMockHandler({
        version: '2026-01-01-11111111-1111-4111-8111-111111111111',
        hash: 'a'.repeat(64),
        defaultModels: { anthropic: 'claude-3-opus-20240229' },
        models: [
          {
            id: 'claude-3-opus-20240229',
            label: 'Claude X',
            provider: 'anthropic',
            contextWindow: 200_000,
            maxOutput: 8_192,
            supportsTemperature: true,
            prices: { input: 1, cachedInput: 0.5, output: 4 },
          },
        ],
      }),
    );
    renderPicker('claude-3-opus-20240229');
    await openPicker(/Claude X/);

    expect(await screen.findAllByRole('option')).toHaveLength(1);
    expect(screen.queryByRole('group', { name: 'OpenAI' })).not.toBeInTheDocument();
  });

  it('marks the selected Model', async () => {
    renderPicker('gpt-5');
    await openPicker();

    expect(await screen.findByRole('option', { name: /GPT-5(?! mini)/ })).toHaveAttribute(
      'data-checked',
      'true',
    );
    expect(screen.getByRole('option', { name: /GPT-4.1 mini/ })).not.toHaveAttribute(
      'data-checked',
      'true',
    );
  });

  it('highlights one row at a time, starting on the selected Model', async () => {
    renderPicker('gpt-5');
    await openPicker();

    const highlighted = async () =>
      (await screen.findAllByRole('option')).filter(
        (option) => option.getAttribute('data-selected') === 'true',
      );
    expect(await highlighted()).toHaveLength(1);
    expect(await highlighted()).toEqual([screen.getByRole('option', { name: /GPT-5(?! mini)/ })]);

    await userEvent.keyboard('{ArrowUp}');

    expect(await highlighted()).toEqual([screen.getByRole('option', { name: /GPT-4o mini/ })]);
  });

  it('filters as you type, by label, id and provider', async () => {
    renderPicker();
    await openPicker();

    await userEvent.type(await screen.findByRole('combobox'), 'claude');

    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option', { name: /Claude 3.5 Haiku/ })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'OpenAI' })).not.toBeInTheDocument();
  });

  it('says when nothing matches', async () => {
    renderPicker();
    await openPicker();

    await userEvent.type(await screen.findByRole('combobox'), 'zzz');

    expect(screen.getByText(/No Models match/)).toBeInTheDocument();
  });

  it('reports the Model picked with the mouse and closes', async () => {
    const onModelChange = renderPicker();
    await openPicker();

    await userEvent.click(await screen.findByRole('option', { name: /GPT-4.1 mini/ }));

    expect(onModelChange).toHaveBeenCalledWith('gpt-4.1-mini');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('picks with the arrow keys and Enter', async () => {
    const onModelChange = renderPicker('gpt-5');
    await openPicker();
    await screen.findByRole('combobox');

    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await userEvent.keyboard('{Enter}');

    expect(onModelChange).toHaveBeenCalledTimes(1);
    expect(onModelChange).toHaveBeenCalledWith('claude-3-5-haiku-20241022');
  });

  describe('Favorite models', () => {
    const { favorites: favoritesHeading, addFavorite, removeFavorite } = resources.chat.modelPicker;

    it('has no Favorites group until a Model is starred', async () => {
      renderPicker();
      await openPicker();

      await screen.findByRole('group', { name: 'OpenAI' });
      expect(screen.queryByRole('group', { name: favoritesHeading })).not.toBeInTheDocument();
    });

    it('stars a Model without selecting it or closing the picker', async () => {
      const onModelChange = renderPicker();
      await openPicker();

      await userEvent.click(
        await screen.findByRole('button', { name: addFavorite('GPT-4.1 mini') }),
      );

      expect(onModelChange).not.toHaveBeenCalled();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(useFavoriteModelsStore.getState().favorites).toEqual(['gpt-4.1-mini']);
    });

    it('lists a favorite on top and keeps it under its provider', async () => {
      useFavoriteModelsStore.setState({ favorites: ['claude-3-5-haiku-20241022'] });
      renderPicker();
      await openPicker();

      const groups = await screen.findAllByRole('group');
      expect(groups[0]).toHaveAccessibleName(favoritesHeading);
      expect(within(groups[0]).getByRole('option', { name: /Claude 3.5 Haiku/ })).toBeVisible();
      expect(
        within(screen.getByRole('group', { name: 'Anthropic' })).getByRole('option', {
          name: /Claude 3.5 Haiku/,
        }),
      ).toBeVisible();
    });

    it('lists favorites in the order they were starred', async () => {
      useFavoriteModelsStore.setState({ favorites: ['gpt-5', 'gpt-4o'] });
      renderPicker();
      await openPicker();

      const group = await screen.findByRole('group', { name: favoritesHeading });
      expect(
        within(group)
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual([expect.stringContaining('GPT-5'), expect.stringContaining('GPT-4o')]);
    });

    it('unstars a favorite and drops the group once it is empty', async () => {
      useFavoriteModelsStore.setState({ favorites: ['gpt-5'] });
      renderPicker();
      await openPicker();
      const group = await screen.findByRole('group', { name: favoritesHeading });

      await userEvent.click(within(group).getByRole('button', { name: removeFavorite('GPT-5') }));

      expect(useFavoriteModelsStore.getState().favorites).toEqual([]);
      expect(screen.queryByRole('group', { name: favoritesHeading })).not.toBeInTheDocument();
    });

    it('selects a Model picked from the Favorites group', async () => {
      useFavoriteModelsStore.setState({ favorites: ['gpt-4o'] });
      const onModelChange = renderPicker();
      await openPicker();
      const group = await screen.findByRole('group', { name: favoritesHeading });

      await userEvent.click(within(group).getByRole('option', { name: /GPT-4o/ }));

      expect(onModelChange).toHaveBeenCalledWith('gpt-4o');
    });

    it('hides a favorite the catalog no longer serves and keeps it stored', async () => {
      useFavoriteModelsStore.setState({ favorites: ['retired-model'] });
      renderPicker();
      await openPicker();

      await screen.findByRole('group', { name: 'OpenAI' });
      expect(screen.queryByRole('group', { name: favoritesHeading })).not.toBeInTheDocument();
      expect(useFavoriteModelsStore.getState().favorites).toEqual(['retired-model']);
    });

    it('does not match the search box against the way favorites are keyed', async () => {
      useFavoriteModelsStore.setState({ favorites: ['gpt-5'] });
      renderPicker();
      await openPicker();

      await userEvent.type(await screen.findByRole('combobox'), 'favorite');

      expect(screen.getByText(/No Models match/)).toBeInTheDocument();
    });

    it('keeps the stars out of the tab order, where Enter would pick a Model instead', async () => {
      useFavoriteModelsStore.setState({ favorites: ['gpt-5'] });
      renderPicker('gpt-5');
      await openPicker();
      await screen.findByRole('combobox');

      await userEvent.tab();

      expect(document.activeElement?.getAttribute('aria-label') ?? '').not.toMatch(/favorites/);
    });

    it('filters the Favorites group with the search box', async () => {
      useFavoriteModelsStore.setState({ favorites: ['gpt-5', 'claude-3-5-haiku-20241022'] });
      renderPicker();
      await openPicker();

      await userEvent.type(await screen.findByRole('combobox'), 'claude');

      const group = screen.getByRole('group', { name: favoritesHeading });
      expect(within(group).getAllByRole('option')).toHaveLength(1);
    });
  });

  it('says the Models are loading while the catalog is on its way', async () => {
    server.use(
      http.get(API_ROUTE.models, async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );
    renderPicker('gpt-5');

    await userEvent.click(screen.getByRole('button', { name: /gpt-5/ }));

    expect(await screen.findByText(resources.chat.modelPicker.loading)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('keeps the current Model on the trigger and offers a retry when the catalog fails', async () => {
    server.use(mockApiError('get', API_ROUTE.models, 500));
    renderPicker('gpt-5');

    await userEvent.click(screen.getByRole('button', { name: /gpt-5/ }));

    expect(await screen.findByText(resources.chat.modelPicker.error)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /gpt-5/ })).toBeInTheDocument();

    server.resetHandlers();
    await userEvent.click(screen.getByRole('button', { name: resources.chat.modelPicker.retry }));

    expect(await screen.findByRole('option', { name: /GPT-4.1 mini/ })).toBeInTheDocument();
    expect(screen.queryByText(resources.chat.modelPicker.error)).not.toBeInTheDocument();
  });
});
