import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ModelSelect } from '@/modules/chat/components/ModelSelect';
import { useModelPickerStore } from '@/modules/chat/stores/useModelPickerStore';
import type { ModelOption } from '@/modules/chat/types/types';
import { renderWithProviders } from '@/test/render';

const options: ModelOption[] = [
  { label: 'GPT-4.1 mini', value: 'gpt-4.1-mini', provider: 'openai', contextWindow: 1_047_576 },
  { label: 'GPT-5', value: 'gpt-5', provider: 'openai', contextWindow: 400_000 },
  { label: 'Claude 3 Opus', value: 'claude-3-opus', provider: 'anthropic', contextWindow: 200_000 },
];

const renderPicker = (selectedModel = 'gpt-5', onModelChange = vi.fn()) => {
  renderWithProviders(
    <ModelSelect selectedModel={selectedModel} onModelChange={onModelChange} options={options} />,
  );
  return onModelChange;
};

const openPicker = () => userEvent.click(screen.getByRole('button', { name: /GPT-5/ }));

describe('ModelSelect', () => {
  beforeEach(() => {
    useModelPickerStore.setState({ isOpen: false, search: '' });
  });

  it('shows the logo and label of the selected Model on the trigger', () => {
    renderPicker('gpt-4.1-mini');

    const trigger = screen.getByRole('button', { name: /GPT-4.1 mini/ });
    expect(within(trigger).getByRole('img', { name: 'OpenAI' })).toBeInTheDocument();
  });

  it('shows an id outside the list as itself', () => {
    renderPicker('gpt-9');

    expect(screen.getByRole('button', { name: /gpt-9/ })).toBeInTheDocument();
  });

  it('groups Models by provider with label, id and context size', async () => {
    renderPicker();
    await openPicker();

    const openai = await screen.findByRole('group', { name: 'OpenAI' });
    expect(within(openai).getAllByRole('option')).toHaveLength(2);
    const mini = within(openai).getByRole('option', { name: /GPT-4.1 mini/ });
    expect(mini).toHaveTextContent('gpt-4.1-mini');
    expect(mini).toHaveTextContent('1M');
    expect(
      within(screen.getByRole('group', { name: 'Anthropic' })).getAllByRole('option'),
    ).toHaveLength(1);
  });

  it('marks the selected Model', async () => {
    renderPicker('gpt-5');
    await openPicker();

    expect(await screen.findByRole('option', { name: /GPT-5/ })).toHaveAttribute(
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
    expect(await highlighted()).toEqual([screen.getByRole('option', { name: /GPT-5/ })]);

    await userEvent.keyboard('{ArrowUp}');

    expect(await highlighted()).toEqual([screen.getByRole('option', { name: /GPT-4.1 mini/ })]);
  });

  it('filters as you type, by label, id and provider', async () => {
    renderPicker();
    await openPicker();

    await userEvent.type(await screen.findByRole('combobox'), 'claude');

    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option', { name: /Claude 3 Opus/ })).toBeInTheDocument();
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

    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(onModelChange).toHaveBeenCalledTimes(1);
    expect(onModelChange).toHaveBeenCalledWith('claude-3-opus');
  });
});
