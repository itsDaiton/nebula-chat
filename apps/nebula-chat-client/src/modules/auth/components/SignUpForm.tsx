import type { FormEvent } from 'react';
import { Button, Stack } from '@chakra-ui/react';
import { AuthField } from '@/modules/auth/components/AuthField';
import { AuthFormAlert } from '@/modules/auth/components/AuthFormAlert';
import { useSignUp } from '@/modules/auth/hooks/useSignUp';
import { formValue } from '@/modules/auth/utils/formValue';
import { resources } from '@/resources';

export const SignUpForm = () => {
  const { mutate, isPending, error } = useSignUp();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutate({
      name: formValue(form, 'name'),
      email: formValue(form, 'email'),
      password: formValue(form, 'password'),
    });
  };

  return (
    <form onSubmit={handleSubmit} aria-label={resources.auth.tabs.signUp}>
      <Stack gap={4}>
        <AuthFormAlert error={error} />
        <AuthField label={resources.auth.fields.name} name="name" type="text" autoComplete="name" />
        <AuthField
          label={resources.auth.fields.email}
          name="email"
          type="email"
          autoComplete="email"
        />
        <AuthField
          label={resources.auth.fields.password}
          name="password"
          type="password"
          autoComplete="new-password"
        />
        <Button type="submit" loading={isPending}>
          {resources.auth.actions.signUp}
        </Button>
      </Stack>
    </form>
  );
};
