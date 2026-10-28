import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ModelSelect } from '@/modules/chat/components/ModelSelect';
import { renderWithProviders } from '@/test/render';

describe('ModelSelect', () => {
  it('shows the currently selected model', () => {
    renderWithProviders(<ModelSelect selectedModel="gpt-4o-mini" onModelChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /GPT-4o mini/ })).toBeInTheDocument();
  });

  it('lists every Model and marks the selected one', async () => {
    renderWithProviders(<ModelSelect selectedModel="gpt-4o" onModelChange={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /GPT-4o/ }));

    expect(await screen.findAllByRole('menuitemradio')).toHaveLength(7);
    expect(screen.getByRole('menuitemradio', { name: 'GPT-4o' })).toBeChecked();
  });

  it('reports the Model the User picks', async () => {
    const onModelChange = vi.fn();
    renderWithProviders(<ModelSelect selectedModel="gpt-4o" onModelChange={onModelChange} />);

    await userEvent.click(screen.getByRole('button', { name: /GPT-4o/ }));
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'GPT-5' }));

    expect(onModelChange).toHaveBeenCalledWith('gpt-5');
  });
});
