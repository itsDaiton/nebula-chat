import type { FormEvent } from 'react';
import { Button, Stack } from '@chakra-ui/react';
import { AuthField } from '@/modules/auth/components/AuthField';
import { AuthFormAlert } from '@/modules/auth/components/AuthFormAlert';
import { useSignIn } from '@/modules/auth/hooks/useSignIn';
import { formValue } from '@/modules/auth/utils/formValue';
import { resources } from '@/resources';

export const SignInForm = () => {
  const { mutate, isPending, error } = useSignIn();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutate({ email: formValue(form, 'email'), password: formValue(form, 'password') });
  };

  return (
    <form onSubmit={handleSubmit} aria-label={resources.auth.tabs.signIn}>
      <Stack gap={4}>
        <AuthFormAlert error={error} />
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
          autoComplete="current-password"
        />
        <Button type="submit" loading={isPending}>
          {resources.auth.actions.signIn}
        </Button>
      </Stack>
    </form>
  );
};
