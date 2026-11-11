import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Command, CommandList } from '@/shared/components/ui/command';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { ModelOptionRow } from '@/modules/chat/components/ModelOptionRow';
import type { ModelOptionRowProps } from '@/modules/chat/types/types';
import { resources } from '@/resources';
import { describe, expect, it, vi } from 'vitest';

const model = {
  value: 'gpt-5',
  label: 'GPT-5',
  provider: 'openai',
  contextWindow: 400_000,
  maxOutput: 128_000,
} as const;

const renderRow = (props: Partial<ModelOptionRowProps> = {}) => {
  const onSelect = vi.fn();
  const onToggleFavorite = vi.fn();
  render(
    <TooltipProvider>
      <Command>
        <CommandList>
          <ModelOptionRow
            model={model}
            valuePrefix=""
            isSelected={false}
            isFavorite={false}
            onSelect={onSelect}
            onToggleFavorite={onToggleFavorite}
            {...props}
          />
        </CommandList>
      </Command>
    </TooltipProvider>,
  );
  return { onSelect, onToggleFavorite };
};

describe('ModelOptionRow', () => {
  it('offers to favorite a Model that is not one', () => {
    renderRow();

    expect(
      screen.getByRole('button', { name: resources.chat.modelPicker.addFavorite('GPT-5') }),
    ).toBeInTheDocument();
  });

  it('offers to unfavorite a favorite', () => {
    renderRow({ isFavorite: true });

    expect(
      screen.getByRole('button', { name: resources.chat.modelPicker.removeFavorite('GPT-5') }),
    ).toBeInTheDocument();
  });

  it('toggles the favorite without selecting the row', async () => {
    const { onSelect, onToggleFavorite } = renderRow();

    await userEvent.click(screen.getByRole('button'));

    expect(onToggleFavorite).toHaveBeenCalledWith('gpt-5');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('selects the Model when the row is clicked', async () => {
    const { onSelect } = renderRow();

    await userEvent.click(screen.getByRole('option'));

    expect(onSelect).toHaveBeenCalledWith('gpt-5');
  });
});
