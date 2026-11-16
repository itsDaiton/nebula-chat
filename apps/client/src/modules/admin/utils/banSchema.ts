import { z } from 'zod';
import { resources } from '@/resources';

const text = resources.admin.users.ban;

const today = () => new Date().toISOString().slice(0, 10);

export const banSchema = z
  .object({
    reason: z.string().trim().min(1, text.reasonRequired).max(500, text.reasonTooLong),
    duration: z.enum(['permanent', 'until']),
    // `YYYY-MM-DD` from a date input; only read when the ban is not permanent.
    until: z.string(),
  })
  .superRefine(({ duration, until }, ctx) => {
    if (duration !== 'until') return;
    if (!until) ctx.addIssue({ code: 'custom', path: ['until'], message: text.dateRequired });
    else if (until <= today()) {
      ctx.addIssue({ code: 'custom', path: ['until'], message: text.dateFuture });
    }
  });
