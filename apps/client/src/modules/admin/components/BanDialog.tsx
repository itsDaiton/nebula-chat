import { addDays, format, parse, startOfToday } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { UsageSegmented } from '@/modules/admin/components/UsageSegmented';
import { useUserActions } from '@/modules/admin/hooks/useUserActions';
import type { BanDialogProps, BanValues } from '@/modules/admin/types/types';
import { banSchema } from '@/modules/admin/utils/banSchema';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import { Calendar } from '@/shared/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/shared/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Textarea } from '@/shared/components/ui/textarea';

const text = resources.admin.users.ban;

/** Ban with a reason, permanent or until a future day (ends at the end of that UTC day). */
export const BanDialog = ({ user, open, onOpenChange }: BanDialogProps) => {
  const { ban } = useUserActions(user);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BanValues>({
    resolver: zodResolver(banSchema),
    mode: 'onTouched',
    defaultValues: { reason: '', duration: 'permanent', until: '' },
  });
  const duration = watch('duration');
  const untilDay = watch('until');
  const selected = untilDay ? parse(untilDay, 'yyyy-MM-dd', new Date()) : undefined;

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
            <UsageSegmented
              label={text.duration}
              value={duration}
              options={[
                { value: 'permanent', label: text.permanent },
                { value: 'until', label: text.untilDate },
              ]}
              onChange={(next) => setValue('duration', next, { shouldValidate: true })}
            />
            {duration === 'until' && (
              <Field data-invalid={Boolean(errors.until)}>
                <Popover>
                  <PopoverTrigger
                    aria-label={text.date}
                    aria-invalid={Boolean(errors.until)}
                    aria-errormessage={errors.until ? 'ban-until-error' : undefined}
                    className="flex h-9 w-48 items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
                  >
                    <CalendarIcon className="size-4 text-muted-foreground" />
                    {selected ? format(selected, 'd MMM yyyy') : text.pickDate}
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selected}
                      onSelect={(day) =>
                        setValue('until', day ? format(day, 'yyyy-MM-dd') : '', {
                          shouldValidate: true,
                        })
                      }
                      disabled={{ before: addDays(startOfToday(), 1) }}
                    />
                  </PopoverContent>
                </Popover>
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
