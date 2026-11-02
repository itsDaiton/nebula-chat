import { Loader2Icon } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type FieldValues, type Path } from 'react-hook-form';
import { AuthFormAlert } from '@/modules/auth/components/AuthFormAlert';
import { AuthFormField } from '@/modules/auth/components/AuthFormField';
import { AuthHeading } from '@/modules/auth/components/AuthHeading';
import { AuthStatus } from '@/modules/auth/components/AuthStatus';
import { useAuthMutation } from '@/modules/auth/hooks/useAuthMutation';
import { usePasswordVisibilityStore } from '@/modules/auth/stores/usePasswordVisibilityStore';
import type { AuthFormProps } from '@/modules/auth/types/types';
import { AuthRequestError } from '@/modules/auth/utils/AuthRequestError';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/utils/cn';

/** One auth form — sign-in, sign-up, forgot, reset or change password — as its config describes it. */
export const AuthForm = <Values extends FieldValues>({
  config,
  header = 'full',
  compact = false,
  onSuccess,
  onError,
  labelActions,
}: AuthFormProps<Values>) => {
  const {
    label,
    title,
    description,
    submitLabel,
    schema,
    fields,
    request,
    successMessage,
    destructive,
  } = config;
  const { mutate, isPending, isSuccess } = useAuthMutation(request, onSuccess);
  const { hidePassword } = usePasswordVisibilityStore();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    trigger,
    getFieldState,
    formState: { errors, isSubmitted },
  } = useForm<Values>({ resolver: zodResolver(schema), mode: 'onTouched' });

  // react-hook-form re-validates only the field that changed; a field compared with it would keep a stale error.
  const revalidateComparedWith = (name: Path<Values>) =>
    fields
      .filter(({ comparedWith }) => comparedWith === name)
      .filter((field) => isSubmitted || getFieldState(field.name).isTouched)
      .forEach((field) => void trigger(field.name));

  const showServerError = (error: Error) => {
    const target = error instanceof AuthRequestError ? error.field : 'root';
    const field = fields.find(({ name }) => name === target);
    setError(field?.name ?? 'root.server', { message: error.message });
    onError?.(error);
  };

  const onSubmit = (values: Values) =>
    mutate(values, {
      onSuccess: () => {
        hidePassword();
        // A form that stays on the page doesn't keep the passwords it just sent on screen.
        if (!successMessage) reset();
      },
      onError: showServerError,
    });

  if (isSuccess && successMessage) {
    return <AuthStatus title={title} status="success" message={successMessage} />;
  }

  return (
    <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} aria-label={label} noValidate>
      <div className="flex flex-col gap-4">
        {header === 'full' && <AuthHeading title={title} description={description} />}
        {header === 'description' && <p className="text-sm text-muted-foreground">{description}</p>}
        <AuthFormAlert message={errors.root?.server?.message} />
        {fields.map((field) => (
          <AuthFormField
            key={field.name}
            label={field.label}
            type={field.type}
            autoComplete={field.autoComplete}
            registration={register(field.name, {
              onChange: () => revalidateComparedWith(field.name),
            })}
            error={errors[field.name]?.message?.toString()}
            labelAction={labelActions?.[field.name]}
          />
        ))}
        <Button
          type="submit"
          size={compact ? 'default' : 'lg'}
          variant={destructive ? 'destructive' : 'default'}
          disabled={isPending}
          aria-busy={isPending}
          className={cn('mt-2', compact ? 'self-start' : 'w-full')}
        >
          {isPending && <Loader2Icon className="animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};
