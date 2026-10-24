import { describe, expect, it, vi } from 'vitest';
import { createSupabaseProfileImageStore } from '@server/modules/profileImage/profileImage.supabaseStore';

/** A Supabase client whose bucket answers each call with `result`. */
const fakeClient = (result: { error: Error | null } = { error: null }) => {
  const bucket = {
    upload: vi.fn(async () => result),
    remove: vi.fn(async () => result),
    getPublicUrl: vi.fn((key: string) => ({
      data: {
        publicUrl: `https://project.supabase.co/storage/v1/object/public/profile-images/${key}`,
      },
    })),
  };
  const from = vi.fn(() => bucket);
  return { client: { storage: { from } } as never, from, bucket };
};

describe('createSupabaseProfileImageStore', () => {
  it('uploads a new WebP to the bucket and returns its public URL', async () => {
    const { client, from, bucket } = fakeClient();
    const store = createSupabaseProfileImageStore({ client, bucket: 'profile-images' });
    const bytes = Buffer.from('webp');

    const url = await store.put('user-1/a.webp', bytes);

    expect(from).toHaveBeenCalledWith('profile-images');
    expect(bucket.upload).toHaveBeenCalledWith(
      'user-1/a.webp',
      bytes,
      expect.objectContaining({ contentType: 'image/webp', upsert: false }),
    );
    expect(url).toBe(
      'https://project.supabase.co/storage/v1/object/public/profile-images/user-1/a.webp',
    );
  });

  it('removes a file by its key', async () => {
    const { client, bucket } = fakeClient();

    await createSupabaseProfileImageStore({ client, bucket: 'profile-images' }).delete(
      'user-1/a.webp',
    );

    expect(bucket.remove).toHaveBeenCalledWith(['user-1/a.webp']);
  });

  it.each(['put', 'delete'] as const)('throws when %s fails in Supabase', async (operation) => {
    const { client } = fakeClient({ error: new Error('bucket not found') });
    const store = createSupabaseProfileImageStore({ client, bucket: 'profile-images' });

    await expect(store[operation]('user-1/a.webp', Buffer.from('webp'))).rejects.toThrow(
      'bucket not found',
    );
  });
});
