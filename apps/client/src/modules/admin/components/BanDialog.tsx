import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useUserActions } from '@/modules/admin/hooks/useUserActions';
import type { BanDialogProps, BanValues } from '@/modules/admin/types/types';
import { banSchema } from '@/modules/admin/utils/banSchema';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';

const text = resources.admin.users.ban;

/** Ban with a reason, permanent or until a future day (ends at the end of that UTC day). */
export const BanDialog = ({ user, open, onOpenChange }: BanDialogProps) => {
  const { ban } = useUserActions(user);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<BanValues>({
    resolver: zodResolver(banSchema),
    mode: 'onTouched',
    defaultValues: { reason: '', duration: 'permanent', until: '' },
  });
  const duration = watch('duration');

  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const onSubmit = ({ reason, duration: kind, until }: BanValues) =>
    ban.mutate(
      {
        id: user.id,
        data: {
          reason: reason.trim(),
          ...(kind === 'until' && { expiresAt: `${until}T23:59:59.000Z` }),
        },
      },
      { onSuccess: () => close(false) },
    );

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        >
          <DialogHeader>
            <DialogTitle>{text.title(user.email)}</DialogTitle>
            <DialogDescription>{text.description}</DialogDescription>
          </DialogHeader>
          <Field data-invalid={Boolean(errors.reason)}>
            <FieldLabel htmlFor="ban-reason">
              {text.reason}{' '}
              <span className="font-normal text-muted-foreground">{text.reasonHint}</span>
            </FieldLabel>
            <Textarea
              id="ban-reason"
              aria-invalid={Boolean(errors.reason)}
              aria-errormessage={errors.reason ? 'ban-reason-error' : undefined}
              {...register('reason')}
            />
            {errors.reason && (
              <FieldError id="ban-reason-error">{errors.reason.message}</FieldError>
            )}
          </Field>
          <FieldSet>
            <FieldLegend variant="label">{text.duration}</FieldLegend>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="radio" value="permanent" {...register('duration')} />
                {text.permanent}
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" value="until" {...register('duration')} />
                {text.untilDate}
              </label>
            </div>
            {duration === 'until' && (
              <Field data-invalid={Boolean(errors.until)}>
                <Input
                  type="date"
                  aria-label={text.date}
                  aria-invalid={Boolean(errors.until)}
                  aria-errormessage={errors.until ? 'ban-until-error' : undefined}
                  className="w-44"
                  {...register('until')}
                />
                {errors.until && (
                  <FieldError id="ban-until-error">{errors.until.message}</FieldError>
                )}
              </Field>
            )}
          </FieldSet>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>
              {resources.admin.users.actions.cancel}
            </Button>
            <Button type="submit" variant="destructive" loading={ban.isPending}>
              {ban.isPending ? text.confirming : text.confirm}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
