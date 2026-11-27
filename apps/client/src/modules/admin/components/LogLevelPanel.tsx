import { InfoIcon, XIcon } from 'lucide-react';
import { UsageSegmented } from '@/modules/admin/components/UsageSegmented';
import { useLogLevelChange } from '@/modules/admin/hooks/useLogLevelChange';
import { useLogLevelFormStore } from '@/modules/admin/stores/useLogLevelFormStore';
import type { LogLevelPanelProps } from '@/modules/admin/types/types';
import {
  LOG_LEVEL_CHOICES,
  LOG_LEVEL_SERVICES,
  LOG_LEVEL_TARGETS,
  LOG_LEVEL_TTLS,
  componentOf,
} from '@/modules/admin/utils/logLevels';
import { resources } from '@/resources';
import { useOnUnmount } from '@/shared/hooks/useOnUnmount';
import { Button } from '@/shared/components/ui/button';
import { IconButton } from '@/shared/components/ui/icon-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

const text = resources.admin.operations;
const label = 'text-[13px] font-medium';

const serviceOptions = LOG_LEVEL_SERVICES.map((value) => ({ value, label: text.services[value] }));
const levelOptions = LOG_LEVEL_CHOICES.map((value) => ({ value, label: value }));
const ttlOptions = LOG_LEVEL_TTLS.map((value) => ({
  value: String(value),
  label: text.panel.ttls[value],
}));

/** The Operations page's right panel: changes one service's root or component level for a while. */
export const LogLevelPanel = ({ onClose }: LogLevelPanelProps) => {
  const form = useLogLevelFormStore();
  const apply = useLogLevelChange();
  // The choices belong to this visit: leaving the page starts the next one from the defaults.
  const resetOnLeave = useOnUnmount(form.reset);
  const serviceLabel = text.services[form.service];

  // A new choice clears the last result, so "Sent to" never describes a different change.
  const choose =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      apply.reset();
      set(value);
    };

  const submit = () =>
    apply.mutate({
      data: {
        service: form.service,
        ...componentOf(form.target),
        level: form.level,
        ttlSeconds: form.ttlSeconds,
      },
    });

  return (
    <div ref={resetOnLeave} className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-3.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{text.panel.title}</h2>
        <IconButton variant="ghost" size="icon" label={text.panel.close} onClick={onClose}>
          <XIcon />
        </IconButton>
      </div>
      <div className="flex flex-col gap-2">
        <span className={label}>{text.panel.service}</span>
        <div>
          <UsageSegmented
            label={text.panel.service}
            value={form.service}
            options={serviceOptions}
            onChange={choose(form.chooseService)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span id="log-level-target" className={label}>
          {text.panel.target}
        </span>
        <Select
          value={form.target}
          onValueChange={(value) => value && choose(form.chooseTarget)(value)}
        >
          <SelectTrigger aria-labelledby="log-level-target" className="h-9 w-full font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOG_LEVEL_TARGETS.map((target) => (
              <SelectItem key={target} value={target} className="font-mono">
                {target}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <span className={label}>{text.panel.level}</span>
        <div>
          <UsageSegmented
            label={text.panel.level}
            value={form.level}
            options={levelOptions}
            onChange={choose(form.chooseLevel)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className={label}>{text.panel.ttl}</span>
        <div>
          <UsageSegmented
            label={text.panel.ttl}
            value={String(form.ttlSeconds)}
            options={ttlOptions}
            onChange={(value) =>
              choose(form.chooseTtl)(Number(value) as (typeof LOG_LEVEL_TTLS)[number])
            }
          />
        </div>
      </div>
      <div className="flex gap-2.5 rounded-xl border border-border bg-raised px-3 py-2.5 text-[12.5px] text-foreground-secondary">
        <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
        <p className="m-0">
          {text.panel.notice(form.service, text.panel.ttlWords[form.ttlSeconds])}
        </p>
      </div>
      <Button size="lg" loading={apply.isPending} onClick={submit}>
        {apply.isPending ? text.panel.applying : text.panel.apply(serviceLabel)}
      </Button>
      {apply.data && (
        <output className="text-[12.5px] text-muted-foreground">
          {text.panel.sent(apply.data.receivers)}
        </output>
      )}
    </div>
  );
};
