import { z } from 'zod';

/** The image types an upload may be, by what the bytes decode as rather than the declared type. */
export const PROFILE_IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** The largest upload accepted, before processing. */
export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

// The parser hands the handler a Buffer; the spec shows a binary body.
const imageBytesSchema = z
  .instanceof(Buffer)
  .meta({ override: { type: 'string', format: 'binary' } });

/** The raw image bytes, one entry per accepted content type. */
export const profileImageBodySchema = {
  content: Object.fromEntries(
    PROFILE_IMAGE_CONTENT_TYPES.map((type) => [type, { schema: imageBytesSchema }]),
  ),
};

export const profileImageSchema = z
  .object({
    image: z.url().describe('The public URL of the processed 256×256 WebP'),
  })
  .meta({ id: 'ProfileImage' });

export const profileImageSettingsSchema = z
  .object({
    uploadsEnabled: z
      .boolean()
      .describe('Whether this server can store uploads; removing an image works either way'),
  })
  .meta({ id: 'ProfileImageSettings' });
