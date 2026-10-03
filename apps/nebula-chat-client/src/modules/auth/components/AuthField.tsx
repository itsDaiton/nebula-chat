import { Field, Input } from '@chakra-ui/react';
import type { AuthFieldProps } from '@/modules/auth/types/types';

// Uncontrolled, so a failed submit leaves what the user typed in place.
export const AuthField = ({ label, name, type, autoComplete }: AuthFieldProps) => (
  <Field.Root required>
    <Field.Label>{label}</Field.Label>
    <Input name={name} type={type} autoComplete={autoComplete} />
  </Field.Root>
);
