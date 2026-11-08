import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, delay, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getGetModelCatalogMockHandler } from '@/libs/api/generated/models/models.msw';
import { ModelSelect } from '@/modules/chat/components/ModelSelect';
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
