import { Button, Heading, Stack, Text } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type FieldValues } from 'react-hook-form';
import { AuthFormAlert } from '@/modules/auth/components/AuthFormAlert';
import { AuthFormField } from '@/modules/auth/components/AuthFormField';
import { useAuthMutation } from '@/modules/auth/hooks/useAuthMutation';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import type { AuthFormProps } from '@/modules/auth/types/types';
import { AuthRequestError } from '@/modules/auth/utils/AuthRequestError';

/** The sign-in or sign-up form, as its config describes it. */
export const AuthForm = <Values extends FieldValues>({ config }: AuthFormProps<Values>) => {
  const { label, title, description, submitLabel, schema, fields, request } = config;
  const { mutate, isPending } = useAuthMutation(request);
  const { hidePassword } = usePasswordVisibilityStore();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), mode: 'onTouched' });

  const showServerError = (error: Error) => {
    const target = error instanceof AuthRequestError ? error.field : 'root';
    const field = fields.find(({ name }) => name === target);
    setError(field?.name ?? 'root.server', { message: error.message });
  };

  const onSubmit = (values: Values) =>
    mutate(values, { onSuccess: hidePassword, onError: showServerError });

  return (
    <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} aria-label={label} noValidate>
      <Stack gap={4}>
        <Stack gap={1} mb={2}>
          <Heading as="h1" size="xl">
            {title}
          </Heading>
          <Text color="fg.muted" fontSize="sm">
            {description}
          </Text>
        </Stack>
        <AuthFormAlert message={errors.root?.server?.message} />
        {fields.map((field) => (
          <AuthFormField
            key={field.name}
            label={field.label}
            type={field.type}
            autoComplete={field.autoComplete}
            registration={register(field.name)}
            error={errors[field.name]?.message?.toString()}
          />
        ))}
        <Button type="submit" loading={isPending} mt={2}>
          {submitLabel}
        </Button>
      </Stack>
    </form>
  );
};
