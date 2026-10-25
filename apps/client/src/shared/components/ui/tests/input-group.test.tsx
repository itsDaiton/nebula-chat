import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from '@/shared/components/ui/input-group';
import { renderWithProviders } from '@/test/render';

describe('InputGroup', () => {
  it('focuses the control when its addon is clicked', async () => {
    renderWithProviders(
      <InputGroup>
        <InputGroupInput aria-label="Search" />
        <InputGroupAddon>
          <InputGroupText>⌘K</InputGroupText>
        </InputGroupAddon>
      </InputGroup>,
    );

    await userEvent.click(screen.getByText('⌘K'));

    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveFocus();
  });

  it('holds a textarea and an action button', () => {
    renderWithProviders(
      <InputGroup>
        <InputGroupTextarea aria-label="Message" />
        <InputGroupAddon align="block-end">
          <InputGroupButton>Send</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>,
    );

    expect(screen.getByRole('textbox', { name: 'Message' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('type', 'button');
  });
});
