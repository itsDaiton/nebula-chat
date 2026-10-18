import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const icon = <span data-testid="icon" />;
import { BadgeActionButton } from '@/shared/components/navigation/BadgeActionButton';
import { renderWithChakra } from '@/test/render';

describe('BadgeActionButton', () => {
  it('renders its label', () => {
    renderWithChakra(<BadgeActionButton icon={icon} label="New chat" onClick={vi.fn()} />);

    expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument();
  });

  it('invokes the handler on click', async () => {
    const onClick = vi.fn();
    renderWithChakra(<BadgeActionButton icon={icon} label="New chat" onClick={onClick} />);

    await userEvent.click(screen.getByRole('button', { name: /new chat/i }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders a badge when one is supplied', () => {
    renderWithChakra(
      <BadgeActionButton icon={icon} label="New chat" onClick={vi.fn()} badge={{ text: 'Beta' }} />,
    );

    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('renders the keyboard shortcut hint', () => {
    renderWithChakra(
      <BadgeActionButton
        icon={icon}
        label="Search"
        onClick={vi.fn()}
        shortcut={{ key: 'k', ctrl: true }}
      />,
    );

    expect(screen.getByText('K')).toBeInTheDocument();
  });

  it('omits the shortcut hint when none is configured', () => {
    renderWithChakra(<BadgeActionButton icon={icon} label="Search" onClick={vi.fn()} />);

    expect(screen.queryByText('K')).not.toBeInTheDocument();
  });
});
