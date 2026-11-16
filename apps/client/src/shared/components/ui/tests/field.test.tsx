import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { renderWithProviders } from '@/test/render';

describe('Field', () => {
  it('labels its control and shows the error as an alert', () => {
    renderWithProviders(
      <FieldSet>
        <FieldLegend>Profile</FieldLegend>
        <FieldGroup>
          <Field data-invalid>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input id="name" aria-invalid />
            <FieldDescription>Shown on your sessions</FieldDescription>
            <FieldError errors={[{ message: 'Required' }, { message: 'Required' }]} />
          </Field>
          <FieldSeparator>or</FieldSeparator>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>Email</FieldTitle>
            </FieldContent>
          </Field>
        </FieldGroup>
      </FieldSet>,
    );

    expect(screen.getByRole('group', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInvalid();
    expect(screen.getByRole('alert')).toHaveTextContent(/^Required$/);
  });

  it('lists several distinct errors', () => {
    renderWithProviders(<FieldError errors={[{ message: 'Too short' }, { message: 'Taken' }]} />);

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Too short',
      'Taken',
    ]);
  });

  it('renders nothing without an error', () => {
    renderWithProviders(<FieldError errors={[]} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('prefers its children over the errors', () => {
    renderWithProviders(<FieldError errors={[{ message: 'Taken' }]}>Pick another</FieldError>);

    expect(screen.getByRole('alert')).toHaveTextContent('Pick another');
  });
});
