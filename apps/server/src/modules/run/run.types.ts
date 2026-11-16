import type { z } from 'zod';
import type { runs, steps } from '@nebula-chat/db';
import type { runIdParamsSchema } from '@server/modules/run/run.validation';

export type RunIdParams = z.infer<typeof runIdParamsSchema>;

export type RunWithSteps = typeof runs.$inferSelect & { steps: (typeof steps.$inferSelect)[] };

/** Who is reading a Run: `isActingAdmin` is only asked when they don't own it. */
export type RunReader = {
  userId: string;
  isActingAdmin: () => Promise<boolean>;
};
