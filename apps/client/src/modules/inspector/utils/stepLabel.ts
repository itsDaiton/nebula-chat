import { resources } from '@/resources';

const labels: Record<string, string> = resources.inspector.run.stepLabels;

/** What a Step is doing, by its Agent or tool; an unknown one shows its name. */
export const stepLabel = (name: string) => labels[name] ?? name;
