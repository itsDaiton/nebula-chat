import { useCallback } from 'react';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import {
  DayPicker,
  getDefaultClassNames,
  type ChevronProps,
  type DayButton,
  type RootProps,
} from 'react-day-picker';
import { Button, buttonVariants } from '@/shared/components/ui/button';
import { cn } from '@/shared/utils/cn';

const CHEVRONS = {
  left: ChevronLeftIcon,
  right: ChevronRightIcon,
  up: ChevronDownIcon,
  down: ChevronDownIcon,
};

const CalendarRoot = ({ className, rootRef, ...props }: RootProps) => (
  <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />
);

const CalendarChevron = ({ className, orientation = 'down', ...props }: ChevronProps) => {
  const Icon = CHEVRONS[orientation];
  return <Icon className={cn('size-4', className)} {...props} />;
};

const Calendar = ({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) => {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      className={cn(
        'group/calendar bg-transparent p-2 [--cell-radius:var(--radius-md)] [--cell-size:--spacing(7)]',
        className,
      )}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn('relative flex flex-col gap-4 md:flex-row', defaultClassNames.months),
        month: cn('flex w-full flex-col gap-4', defaultClassNames.month),
        nav: cn(
          'absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1',
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: 'ghost' }),
          'size-(--cell-size) p-0 select-none aria-disabled:opacity-50',
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: 'ghost' }),
          'size-(--cell-size) p-0 select-none aria-disabled:opacity-50',
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          'flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)',
          defaultClassNames.month_caption,
        ),
        caption_label: cn('text-sm font-medium select-none', defaultClassNames.caption_label),
        month_grid: cn('w-full border-collapse', defaultClassNames.month_grid),
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'flex-1 rounded-(--cell-radius) text-[0.8rem] font-normal text-muted-foreground select-none',
          defaultClassNames.weekday,
        ),
        week: cn('mt-2 flex w-full', defaultClassNames.week),
        day: cn(
          'group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none',
          defaultClassNames.day,
        ),
        today: cn(
          'rounded-(--cell-radius) bg-muted text-foreground data-[selected=true]:rounded-(--cell-radius)',
          defaultClassNames.today,
        ),
        outside: cn(
          'text-muted-foreground aria-selected:text-muted-foreground',
          defaultClassNames.outside,
        ),
        disabled: cn('text-muted-foreground opacity-50', defaultClassNames.disabled),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: CalendarRoot,
        Chevron: CalendarChevron,
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  );
};

const CalendarDayButton = ({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) => {
  // react-day-picker marks the keyboard-focused day; this moves real focus onto it.
  const focusWhenMarked = useCallback(
    (node: HTMLButtonElement | null) => {
      if (modifiers.focused) node?.focus();
    },
    [modifiers.focused],
  );

  return (
    <Button
      ref={focusWhenMarked}
      variant="ghost"
      size="icon"
      data-day={day.date.toISOString().slice(0, 10)}
      data-selected-single={modifiers.selected}
      className={cn(
        'relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 border-0 leading-none font-normal group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50 data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground',
        className,
      )}
      {...props}
    />
  );
};

export { Calendar };
