import { z } from 'zod';

// A codec, not a bare `.transform`, so the spec can render the output side as a date-time string.
export const isoDateTimeSchema = z.codec(z.date(), z.iso.datetime(), {
  decode: (date) => date.toISOString(),
  encode: (iso) => new Date(iso),
});
