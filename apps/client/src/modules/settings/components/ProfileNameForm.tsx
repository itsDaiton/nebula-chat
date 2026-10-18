import { Button, Field, HStack, Input } from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { SettingsRow } from '@/modules/settings/components/SettingsRow';
import { useUpdateName } from '@/modules/settings/hooks/useUpdateName';
import type { ProfileNameFormProps, ProfileNameValues } from '@/modules/settings/types/types';
import { profileNameSchema } from '@/modules/settings/utils/settingsSchemas';
import { resources } from '@/resources';
import { toaster } from '@/shared/components/ui/toaster';

const { name: copy } = resources.settings.profile;

/** The Full name row: edit in place, Save once it differs from the saved name. */
export const ProfileNameForm = ({ name }: ProfileNameFormProps) => {
  const { mutate, isPending } = useUpdateName();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<ProfileNameValues>({
    resolver: zodResolver(profileNameSchema),
    mode: 'onTouched',
    defaultValues: { name },
  });

  const onSubmit = (values: ProfileNameValues) =>
    mutate(values, {
      onSuccess: () => {
        reset(values);
        toaster.create({ type: 'success', title: copy.saved });
      },
      onError: (error) => setError('name', { message: error.message }),
    });

  return (
    <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
      <SettingsRow label={copy.label}>
        <Field.Root invalid={Boolean(errors.name)} w={{ base: 'full', md: '80' }}>
          <HStack w="full">
            <Input aria-label={copy.label} autoComplete="name" {...register('name')} />
            <Button type="submit" variant="outline" disabled={!isDirty} loading={isPending}>
              {copy.save}
            </Button>
          </HStack>
          <Field.ErrorText>{errors.name?.message}</Field.ErrorText>
        </Field.Root>
      </SettingsRow>
    </form>
  );
};
