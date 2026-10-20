import type { FastifyInstance } from 'fastify';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ProfileImageStore,
  StoredProfileImage,
} from '@backend/modules/profileImage/profileImage.types';
import { createTestApp } from '@backend/test/app';
import { captureLogger, eventLines } from '@nebula-chat/otel/testing';
import type { LogLine } from '@nebula-chat/otel/testing';
import {
  memoryProfileImageStore,
  memoryProfileImageUrl,
} from '@backend/test/memoryProfileImageStore';
import { guestSession, REGISTERED_USER_ID, registeredSession } from '@backend/test/session';

const state = vi.hoisted(() => ({
  store: null as (ProfileImageStore & { files: Map<string, Buffer> }) | null,
  users: new Map<string, StoredProfileImage>(),
  uploads: new Map<string, number>(),
}));

// No database in a unit test; this also keeps the real pg Pool out of the process.
vi.mock('@backend/db', () => ({ db: {}, closeDb: vi.fn(async () => undefined) }));

vi.mock('@backend/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
}));

// Redis holds the per-user upload count; an in-memory counter stands in for INCR.
vi.mock('@backend/redis', () => ({
  redis: {
    cache: {},
    connection: {},
    authStore: {
      increment: vi.fn(async (key: string) => {
        const next = (state.uploads.get(key) ?? 0) + 1;
        state.uploads.set(key, next);
        return next;
      }),
    },
    close: vi.fn(async () => undefined),
  },
  closeRedis: vi.fn(async () => undefined),
}));

// The repository is the boundary to the users table, through better-auth's adapter.
vi.mock('@backend/modules/profileImage/profileImage.repository', () => ({
  profileImageRepository: {
    find: vi.fn(async (userId: string) => state.users.get(userId) ?? null),
    save: vi.fn(async (userId: string, image: StoredProfileImage) => {
      state.users.set(userId, image);
    }),
  },
}));

// The store Supabase would be; `null` is a server with uploads switched off.
vi.mock('@backend/profileImageStore', () => ({
  get profileImageStore() {
    return state.store;
  },
}));

import { auth } from '@backend/auth';
import { env } from '@backend/env';
import { profileImageRepository } from '@backend/modules/profileImage/profileImage.repository';

const ROUTE = '/api/profile-image';
const COOKIE = { cookie: 'better-auth.session_token=abc' };

const mockedGetSession = vi.mocked(auth.api.getSession);

let app: FastifyInstance;
let lines: LogLine[];

/** A landscape JPEG carrying camera EXIF and a GPS position. */
const photo = () =>
  sharp({ create: { width: 400, height: 200, channels: 3, background: '#3366cc' } })
    .jpeg()
    .withExif({
      IFD0: { Make: 'Camera' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '50/1 5/1 0/1' },
    })
    .toBuffer();

const pngImage = () =>
  sharp({ create: { width: 64, height: 64, channels: 4, background: '#ff000080' } })
    .png()
    .toBuffer();

const animatedWebp = async () => {
  const frame = (background: string) =>
    sharp({ create: { width: 8, height: 8, channels: 3, background } })
      .png()
      .toBuffer();
  return sharp([await frame('red'), await frame('blue')], { join: { animated: true } })
    .webp()
    .toBuffer();
};

const upload = (payload: Buffer, contentType = 'image/jpeg') =>
  app.inject({
    method: 'PUT',
    url: ROUTE,
    headers: { ...COOKIE, 'content-type': contentType },
    payload,
  });

const remove = () => app.inject({ method: 'DELETE', url: ROUTE, headers: COOKIE });

const store = () => state.store!;

const storedKeys = () => [...store().files.keys()];

beforeAll(async () => {
  const capture = captureLogger('info');
  lines = capture.lines;
  app = await createTestApp({ logger: capture.logger });
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  lines.length = 0;
  state.store = memoryProfileImageStore();
  state.users.clear();
  state.uploads.clear();
  mockedGetSession.mockResolvedValue(registeredSession() as never);
});

describe('GET /api/profile-image/settings', () => {
  it('says uploads are on when storage is configured', async () => {
    const res = await app.inject({ method: 'GET', url: `${ROUTE}/settings`, headers: COOKIE });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ uploadsEnabled: true });
  });

  it('says uploads are off without storage', async () => {
    state.store = null;

    const res = await app.inject({ method: 'GET', url: `${ROUTE}/settings`, headers: COOKIE });

    expect(res.json()).toEqual({ uploadsEnabled: false });
  });

  it('answers a request with no auth session with 401', async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: `${ROUTE}/settings` });

    expect(res.statusCode).toBe(401);
  });
});

describe('PUT /api/profile-image', () => {
  // inject() skips the browser's CORS check, so the preflight a browser sends first is tested here.
  it('lets the client origin send the upload past its CORS preflight', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: ROUTE,
      headers: {
        origin: env.CLIENT_URL,
        'access-control-request-method': 'PUT',
        'access-control-request-headers': 'content-type',
      },
    });

    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(env.CLIENT_URL);
    expect(String(res.headers['access-control-allow-methods']).split(/,\s*/)).toContain('PUT');
  });

  it('stores a 256×256 WebP under the user and points the user at it', async () => {
    const res = await upload(await photo());

    expect(res.statusCode).toBe(200);
    const [key] = storedKeys();
    expect(key).toMatch(new RegExp(`^${REGISTERED_USER_ID}/[0-9a-f-]{36}\\.webp$`));
    expect(res.json()).toEqual({ image: memoryProfileImageUrl(key!) });
    expect(state.users.get(REGISTERED_USER_ID)).toEqual({
      image: memoryProfileImageUrl(key!),
      key,
    });
  });

  it('crops to the center and strips every piece of metadata, GPS included', async () => {
    await upload(await photo());

    const metadata = await sharp(store().files.values().next().value).metadata();
    expect(metadata).toMatchObject({ format: 'webp', width: 256, height: 256 });
    expect(metadata.exif).toBeUndefined();
  });

  it.each([
    ['a PNG', 'image/png', pngImage],
    [
      'a WebP',
      'image/webp',
      () =>
        sharp({ create: { width: 10, height: 30, channels: 3, background: 'red' } })
          .webp()
          .toBuffer(),
    ],
  ])('accepts %s', async (_case, contentType, image) => {
    const res = await upload(await image(), contentType);

    expect(res.statusCode).toBe(200);
  });

  it('trusts the bytes over the declared type', async () => {
    const res = await upload(await pngImage(), 'image/jpeg');

    expect(res.statusCode).toBe(200);
  });

  it('replaces the previous upload and deletes its file', async () => {
    await upload(await photo());
    const [first] = storedKeys();

    await upload(await pngImage(), 'image/png');

    const [second] = storedKeys();
    expect(storedKeys()).toHaveLength(1);
    expect(second).not.toBe(first);
    expect(state.users.get(REGISTERED_USER_ID)?.key).toBe(second);
  });

  it('still succeeds when the previous file cannot be deleted, and logs the orphan', async () => {
    await upload(await photo());
    const [first] = storedKeys();
    vi.spyOn(store(), 'delete').mockRejectedValueOnce(new Error('storage down'));

    const res = await upload(await pngImage(), 'image/png');

    expect(res.statusCode).toBe(200);
    expect(eventLines(lines, 'profile_image.delete.failed')).toEqual([
      expect.objectContaining({ 'nebula.profile_image.key': first }),
    ]);
  });

  it('replaces a provider picture without deleting anything', async () => {
    state.users.set(REGISTERED_USER_ID, {
      image: 'https://avatars.githubusercontent.com/u/1',
      key: null,
    });
    const deleteFile = vi.spyOn(store(), 'delete');

    const res = await upload(await photo());

    expect(res.statusCode).toBe(200);
    expect(deleteFile).not.toHaveBeenCalled();
    expect(state.users.get(REGISTERED_USER_ID)?.key).toBe(storedKeys()[0]);
  });

  it('deletes the new file again when the user cannot be saved', async () => {
    vi.mocked(profileImageRepository.save).mockRejectedValueOnce(new Error('db down'));

    const res = await upload(await photo());

    expect(res.statusCode).toBe(500);
    expect(storedKeys()).toEqual([]);
  });

  it.each([
    [
      'random bytes declared as a PNG',
      () => Promise.resolve(Buffer.from('not an image at all')),
      'image/png',
    ],
    ['an empty body', () => Promise.resolve(Buffer.alloc(0)), 'image/png'],
    [
      'a GIF declared as a PNG',
      () =>
        sharp({ create: { width: 4, height: 4, channels: 3, background: 'red' } })
          .gif()
          .toBuffer(),
      'image/png',
    ],
  ])('rejects %s', async (_case, payload, contentType) => {
    const res = await upload(await payload(), contentType);

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ success: false, error: 'BadRequest' });
    expect(storedKeys()).toEqual([]);
  });

  it('rejects an animated image', async () => {
    const res = await upload(await animatedWebp(), 'image/webp');

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ message: 'Animated images are not supported.' });
  });

  it.each(['image/gif', 'application/json', 'text/plain'])(
    'answers a %s body with 415',
    async (contentType) => {
      const res = await upload(await pngImage(), contentType);

      expect(res.statusCode).toBe(415);
      expect(res.json()).toMatchObject({ success: false });
    },
  );

  it('answers a body over 5 MB with 413', async () => {
    const res = await upload(Buffer.alloc(5 * 1024 * 1024 + 1), 'image/png');

    expect(res.statusCode).toBe(413);
    expect(res.json()).toMatchObject({ success: false, error: 'PayloadTooLarge' });
  });

  it('answers a Guest with 403', async () => {
    mockedGetSession.mockResolvedValue(guestSession() as never);

    const res = await upload(await photo());

    expect(res.statusCode).toBe(403);
    expect(storedKeys()).toEqual([]);
  });

  it('answers a request with no auth session with 401', async () => {
    mockedGetSession.mockResolvedValue(null);

    const res = await upload(await photo());

    expect(res.statusCode).toBe(401);
  });

  it('answers 404 while uploads are switched off', async () => {
    state.store = null;

    const res = await upload(await photo());

    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ success: false, error: 'NotFound' });
  });

  it('answers the 11th upload within the hour with 429, counted per user', async () => {
    const image = await pngImage();
    for (let i = 0; i < 10; i += 1) {
      expect((await upload(image, 'image/png')).statusCode).toBe(200);
    }

    const res = await upload(image, 'image/png');

    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchObject({ success: false, error: 'TooManyRequests' });
    expect([...state.uploads.keys()]).toEqual([`profile-image-uploads:${REGISTERED_USER_ID}`]);
  });
});

describe('DELETE /api/profile-image', () => {
  it('clears an uploaded image and deletes its file', async () => {
    await upload(await photo());

    const res = await remove();

    expect(res.statusCode).toBe(204);
    expect(state.users.get(REGISTERED_USER_ID)).toEqual({ image: null, key: null });
    expect(storedKeys()).toEqual([]);
  });

  it('still clears the image when its file cannot be deleted', async () => {
    await upload(await photo());
    vi.spyOn(store(), 'delete').mockRejectedValueOnce(new Error('storage down'));

    const res = await remove();

    expect(res.statusCode).toBe(204);
    expect(state.users.get(REGISTERED_USER_ID)).toEqual({ image: null, key: null });
    expect(eventLines(lines, 'profile_image.delete.failed')).toHaveLength(1);
  });

  it('clears a provider picture without asking the store', async () => {
    state.users.set(REGISTERED_USER_ID, {
      image: 'https://lh3.googleusercontent.com/a/1',
      key: null,
    });
    const deleteFile = vi.spyOn(store(), 'delete');

    const res = await remove();

    expect(res.statusCode).toBe(204);
    expect(state.users.get(REGISTERED_USER_ID)).toEqual({ image: null, key: null });
    expect(deleteFile).not.toHaveBeenCalled();
  });

  it('clears a provider picture while uploads are switched off', async () => {
    state.store = null;
    state.users.set(REGISTERED_USER_ID, {
      image: 'https://lh3.googleusercontent.com/a/1',
      key: null,
    });

    const res = await remove();

    expect(res.statusCode).toBe(204);
    expect(state.users.get(REGISTERED_USER_ID)).toEqual({ image: null, key: null });
  });

  it('clears an upload while uploads are switched off, and logs its orphaned file', async () => {
    state.users.set(REGISTERED_USER_ID, { image: memoryProfileImageUrl('k.webp'), key: 'k.webp' });
    state.store = null;

    const res = await remove();

    expect(res.statusCode).toBe(204);
    expect(state.users.get(REGISTERED_USER_ID)).toEqual({ image: null, key: null });
    expect(eventLines(lines, 'profile_image.orphaned')).toEqual([
      expect.objectContaining({ 'nebula.profile_image.key': 'k.webp' }),
    ]);
  });

  it('succeeds without a change when there is no image', async () => {
    const res = await remove();

    expect(res.statusCode).toBe(204);
    expect(profileImageRepository.save).not.toHaveBeenCalled();
  });

  it('answers a Guest with 403', async () => {
    mockedGetSession.mockResolvedValue(guestSession() as never);

    expect((await remove()).statusCode).toBe(403);
  });

  it('answers a request with no auth session with 401', async () => {
    mockedGetSession.mockResolvedValue(null);

    expect((await remove()).statusCode).toBe(401);
  });
});
