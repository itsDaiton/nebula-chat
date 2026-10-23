import { beforeEach, describe, expect, it, vi } from 'vitest';
import { captureLogger, eventLines } from '@nebula-chat/otel/testing';
import type { LogLine } from '@nebula-chat/otel/testing';
import { deleteProfileImageOfDeletedUser } from '@backend/modules/profileImage/profileImage.cleanup';
import { memoryProfileImageStore } from '@backend/test/memoryProfileImageStore';

const KEY = 'user-1/a.webp';

let lines: LogLine[];
let log: ReturnType<typeof captureLogger>['logger'];

beforeEach(() => {
  ({ logger: log, lines } = captureLogger('info'));
});

describe('deleteProfileImageOfDeletedUser', () => {
  it("deletes a deleted account's uploaded Profile image", async () => {
    const store = memoryProfileImageStore();
    await store.put(KEY, Buffer.from('webp'));
    await store.put('user-2/b.webp', Buffer.from('webp'));

    await deleteProfileImageOfDeletedUser(store, log)({ id: 'user-1', profileImageKey: KEY });

    expect([...store.files.keys()]).toEqual(['user-2/b.webp']);
  });

  it('asks the store nothing for a provider image or no image', async () => {
    const store = memoryProfileImageStore();
    const deleteFile = vi.spyOn(store, 'delete');

    await deleteProfileImageOfDeletedUser(store, log)({ id: 'user-1', profileImageKey: null });

    expect(deleteFile).not.toHaveBeenCalled();
  });

  it('does nothing while uploads are off', async () => {
    await expect(
      deleteProfileImageOfDeletedUser(null, log)({ id: 'user-1', profileImageKey: KEY }),
    ).resolves.toBeUndefined();

    expect(lines).toEqual([]);
  });

  it('logs one warning, and never throws, when the store rejects', async () => {
    const store = memoryProfileImageStore();
    vi.spyOn(store, 'delete').mockRejectedValue(new Error('storage down'));

    await expect(
      deleteProfileImageOfDeletedUser(store, log)({ id: 'user-1', profileImageKey: KEY }),
    ).resolves.toBeUndefined();

    expect(eventLines(lines, 'profile_image.delete.failed')).toEqual([
      expect.objectContaining({
        level: 40,
        'user.id': 'user-1',
        'nebula.profile_image.key': KEY,
        err: expect.objectContaining({ message: 'storage down' }),
      }),
    ]);
  });
});
