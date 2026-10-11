import sharp from 'sharp';
import { BadRequestError } from '@nebula-chat/errors';

/** The one size every Profile image is stored at. */
const PROFILE_IMAGE_SIZE = 256;

const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);

// Phone cameras top out near 50 MP; anything larger is more likely a decompression bomb.
const MAX_INPUT_PIXELS = 50_000_000;

const NOT_AN_IMAGE_MESSAGE = 'The file must be a JPEG, PNG or WebP image.';

const decode = (bytes: Buffer) => sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS });

const readMetadata = async (bytes: Buffer) => {
  try {
    return await decode(bytes).metadata();
  } catch {
    throw new BadRequestError(NOT_AN_IMAGE_MESSAGE);
  }
};

/**
 * Turns an upload into a 256×256 WebP, center-cropped and upright. Re-encoding drops every
 * piece of metadata (EXIF, GPS) and anything a crafted file carried besides its pixels.
 */
export const toProfileImage = async (bytes: Buffer | undefined): Promise<Buffer> => {
  // An empty body reaches the handler as no body at all.
  if (!bytes?.length) throw new BadRequestError(NOT_AN_IMAGE_MESSAGE);
  const metadata = await readMetadata(bytes);
  if (!ACCEPTED_FORMATS.has(metadata.format)) {
    throw new BadRequestError(NOT_AN_IMAGE_MESSAGE);
  }
  if ((metadata.pages ?? 1) > 1) {
    throw new BadRequestError('Animated images are not supported.');
  }
  try {
    return await decode(bytes)
      .rotate()
      .resize(PROFILE_IMAGE_SIZE, PROFILE_IMAGE_SIZE, { fit: 'cover', position: 'centre' })
      .webp()
      .toBuffer();
  } catch {
    // A header that parses over pixel data that does not, e.g. a truncated file.
    throw new BadRequestError(NOT_AN_IMAGE_MESSAGE);
  }
};
