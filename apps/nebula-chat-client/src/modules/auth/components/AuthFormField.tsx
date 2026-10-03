import { Field, Input } from '@chakra-ui/react';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import type { AuthFormFieldProps } from '@/modules/auth/types/types';
import { PasswordInput } from '@/shared/components/ui/password-input';

// Field wires the label, aria-invalid and the error text's aria-errormessage onto the input.
export const AuthFormField = ({
  label,
  type,
  autoComplete,
  registration,
  error,
}: AuthFormFieldProps) => {
  const { isPasswordVisible, togglePasswordVisibility } = usePasswordVisibilityStore();

  return (
    <Field.Root invalid={Boolean(error)}>
      <Field.Label>{label}</Field.Label>
      {type === 'password' ? (
        <PasswordInput
          autoComplete={autoComplete}
          visible={isPasswordVisible}
          onToggleVisibility={togglePasswordVisibility}
          {...registration}
        />
      ) : (
        <Input type={type} autoComplete={autoComplete} {...registration} />
      )}
      <Field.ErrorText>{error}</Field.ErrorText>
    </Field.Root>
  );
};
