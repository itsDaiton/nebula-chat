import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const icon = <span data-testid="icon" />;
import { Page } from '@/shared/components/layout/Page';
import { BadgeActionButton } from '@/shared/components/navigation/BadgeActionButton';
import { NebulaButton } from '@/shared/components/navigation/NebulaButton';
import { renderWithChakra } from '@/test/render';

describe('NebulaButton', () => {
  it('renders its label as a button', () => {
    renderWithChakra(<NebulaButton>Click me</NebulaButton>);

    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('forwards the click handler', async () => {
    const onClick = vi.fn();
    renderWithChakra(<NebulaButton onClick={onClick}>Click me</NebulaButton>);

    await userEvent.click(screen.getByRole('button', { name: 'Click me' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('forwards the disabled state and blocks clicks', async () => {
    const onClick = vi.fn();
    renderWithChakra(
      <NebulaButton disabled onClick={onClick}>
        Click me
      </NebulaButton>,
    );

    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

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

describe('Page', () => {
  it('renders its children', () => {
    renderWithChakra(
      <Page>
        <p>page body</p>
      </Page>,
    );

    expect(screen.getByText('page body')).toBeInTheDocument();
  });

  it('forwards a ref to the container', () => {
    const ref = { current: null } as React.RefObject<HTMLDivElement | null>;

    renderWithChakra(<Page ref={ref}>body</Page>);

    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
