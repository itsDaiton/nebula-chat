import { NotFoundError } from '@nebula-chat/errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '@/libs/api/queryClient';
import { toaster } from '@/shared/components/ui/toaster';
import { resources } from '@/resources';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('createQueryClient', () => {
  it('reports a failed query through the toaster', async () => {
    const toast = vi.spyOn(toaster, 'create');
    const client = createQueryClient({ retry: false });

    await client
      .fetchQuery({
        queryKey: ['failing'],
        queryFn: () => Promise.reject(new NotFoundError('Conversation', 'x')),
      })
      .catch(() => {});

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        title: resources.errors.title,
        description: 'Conversation with id "x" not found',
      }),
    );
  });

  it('reports a failed mutation through the toaster', async () => {
    const toast = vi.spyOn(toaster, 'create');
    const client = createQueryClient({ retry: false });

    await client
      .getMutationCache()
      .build(client, { mutationFn: () => Promise.reject(new Error('boom')) })
      .execute(undefined)
      .catch(() => {});

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'boom' }));
  });

  it('leaves a mutation that renders its own error inline untoasted', async () => {
    const toast = vi.spyOn(toaster, 'create');
    const client = createQueryClient({ retry: false });

    await client
      .getMutationCache()
      .build(client, {
        mutationFn: () => Promise.reject(new Error('boom')),
        meta: { inlineError: true },
      })
      .execute(undefined)
      .catch(() => {});

    expect(toast).not.toHaveBeenCalled();
  });

  it('does not toast a query that succeeds', async () => {
    const toast = vi.spyOn(toaster, 'create');
    const client = createQueryClient({ retry: false });

    await client.fetchQuery({ queryKey: ['ok'], queryFn: () => Promise.resolve(1) });

    expect(toast).not.toHaveBeenCalled();
  });
});
