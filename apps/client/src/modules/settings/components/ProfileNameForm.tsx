import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { SettingsRow } from '@/modules/settings/components/SettingsRow';
import { useUpdateName } from '@/modules/settings/hooks/useUpdateName';
import type { ProfileNameFormProps, ProfileNameValues } from '@/modules/settings/types/types';
import { profileNameSchema } from '@/modules/settings/utils/settingsSchemas';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

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
        toast.success(copy.saved);
      },
      onError: (error) => setError('name', { message: error.message }),
    });

  return (
    <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
      <SettingsRow label={copy.label}>
        <div className="flex w-full flex-col gap-1 sm:w-80">
          <div className="flex gap-2">
            <Input
              aria-label={copy.label}
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
              aria-errormessage="profile-name-error"
              {...register('name')}
            />
            <Button type="submit" variant="outline" disabled={!isDirty || isPending}>
              {copy.save}
            </Button>
          </div>
          {errors.name && (
            <p id="profile-name-error" className="text-sm text-destructive">
              {errors.name.message}
            </p>
          )}
        </div>
      </SettingsRow>
    </form>
  );
};
