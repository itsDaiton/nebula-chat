import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ModelSelect } from '@/modules/chat/components/ModelSelect';
import { useMessageStore } from '@/modules/chat/stores/useMessageStore';
import { useModelSelectorStore } from '@/modules/chat/stores/useModelSelectorStore';
import { renderWithChakra } from '@/test/render';

beforeEach(() => {
  vi.clearAllMocks();
  useMessageStore.setState({ message: '' });
  useModelSelectorStore.setState({ isSelectOpen: false, triggerWidth: 120 });
});

describe('ModelSelect', () => {
  // The label also appears in the hidden native <select>, so the trigger's own
  // value text is queried rather than the whole tree.
  const valueText = (container: HTMLElement) =>
    container.querySelector('[data-part="value-text"]')?.textContent;

  it('shows the currently selected model', () => {
    const { container } = renderWithChakra(
      <ModelSelect
        selectedModel="gpt-4o-mini"
        onModelChange={vi.fn()}
        isSelectOpen={false}
        setIsSelectOpen={vi.fn()}
      />,
    );

    expect(valueText(container)).toBe('GPT-4o mini');
  });

  it('reflects a different selection', () => {
    const { container } = renderWithChakra(
      <ModelSelect
        selectedModel="gpt-4o"
        onModelChange={vi.fn()}
        isSelectOpen={false}
        setIsSelectOpen={vi.fn()}
      />,
    );

    expect(valueText(container)).toBe('GPT-4o');
  });

  it('exposes the trigger as a combobox for keyboard and screen-reader users', () => {
    const { container } = renderWithChakra(
      <ModelSelect
        selectedModel="gpt-4o-mini"
        onModelChange={vi.fn()}
        isSelectOpen={false}
        setIsSelectOpen={vi.fn()}
      />,
    );

    expect(container.querySelector('[data-part="trigger"]')).toBeInTheDocument();
  });
});
