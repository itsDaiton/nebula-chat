import { GetModelUsageSeriesAudience } from '@/libs/api/generated/model/getModelUsageSeriesAudience';
import { GetModelUsageSeriesMetric } from '@/libs/api/generated/model/getModelUsageSeriesMetric';
import { GetModelUsageSeriesRange } from '@/libs/api/generated/model/getModelUsageSeriesRange';
import { UsageModelFilter } from '@/modules/admin/components/UsageModelFilter';
import { UsageSegmented } from '@/modules/admin/components/UsageSegmented';
import type { UsageToolbarProps } from '@/modules/admin/types/types';
import { resources } from '@/resources';

const text = resources.admin.usage;

const metricOptions = Object.values(GetModelUsageSeriesMetric).map((value) => ({
  value,
  label: text.metrics[value],
}));
const rangeOptions = Object.values(GetModelUsageSeriesRange).map((value) => ({
  value,
  label: value,
}));
const viewOptions = (['share', 'volume'] as const).map((value) => ({
  value,
  label: text.views[value],
}));
const audienceOptions = Object.values(GetModelUsageSeriesAudience).map((value) => ({
  value,
  label: text.audiences[value],
}));

/** Every choice here is written to the URL, so the page is a link. */
export const UsageToolbar = ({ params, onChange }: UsageToolbarProps) => (
  <fieldset
    aria-label={text.toolbar}
    className="m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 px-5 pt-0 pb-3"
  >
    <UsageSegmented
      label={text.metric}
      value={params.metric}
      options={metricOptions}
      onChange={(metric) => onChange({ metric })}
    />
    <UsageSegmented
      label={text.range}
      value={params.range}
      options={rangeOptions}
      onChange={(range) => onChange({ range })}
    />
    <UsageSegmented
      label={text.view}
      value={params.view}
      options={viewOptions}
      onChange={(view) => onChange({ view })}
    />
    <span className="grow" />
    <UsageModelFilter
      selected={params.models}
      hasRun={params.metric === 'prompts'}
      onChange={(models) => onChange({ models })}
    />
    <UsageSegmented
      label={text.audience}
      value={params.audience}
      options={audienceOptions}
      onChange={(audience) => onChange({ audience })}
    />
  </fieldset>
);
