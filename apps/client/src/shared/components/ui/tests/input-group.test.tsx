import { screen } from '@testing-library/react';
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
  it('labels its input and shows the addon beside it', () => {
    renderWithProviders(
      <InputGroup>
        <InputGroupInput aria-label="Search" />
        <InputGroupAddon>
          <InputGroupText>⌘K</InputGroupText>
        </InputGroupAddon>
      </InputGroup>,
    );

    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByText('⌘K')).toBeVisible();
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
