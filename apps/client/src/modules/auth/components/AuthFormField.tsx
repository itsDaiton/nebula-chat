import { useId } from 'react';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import type { AuthFormFieldProps } from '@/modules/auth/types/types';
import { Field, FieldLabel } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { PasswordInput } from '@/shared/components/ui/password-input';

/** A labelled input whose error is wired to it with aria-errormessage. */
export const AuthFormField = ({
  label,
  type,
  autoComplete,
  registration,
  error,
}: AuthFormFieldProps) => {
  const { visibleFields, togglePasswordVisibility } = usePasswordVisibilityStore();
  const id = useId();
  const errorId = `${id}-error`;
  const invalid = {
    id,
    'aria-invalid': Boolean(error),
    'aria-errormessage': error ? errorId : undefined,
  };

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {type === 'password' ? (
        <PasswordInput
          autoComplete={autoComplete}
          visible={Boolean(visibleFields[registration.name])}
          onToggleVisibility={() => togglePasswordVisibility(registration.name)}
          {...invalid}
          {...registration}
        />
      ) : (
        <Input type={type} autoComplete={autoComplete} {...invalid} {...registration} />
      )}
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </Field>
  );
};
