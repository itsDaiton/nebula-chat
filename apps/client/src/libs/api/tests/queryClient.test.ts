import { NotFoundError } from '@nebula-chat/errors';
import { toast as sonner } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '@/libs/api/queryClient';
import { resources } from '@/resources';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('createQueryClient', () => {
  it('reports a failed query through the toaster', async () => {
    const toast = vi.spyOn(sonner, 'error');
    const client = createQueryClient({ retry: false });

    await client
      .fetchQuery({
        queryKey: ['failing'],
        queryFn: () => Promise.reject(new NotFoundError('Session', 'x')),
      })
      .catch(() => {});

    expect(toast).toHaveBeenCalledWith(resources.errors.title, {
      description: 'Session with id "x" not found',
    });
  });

  it('reports a failed mutation through the toaster', async () => {
    const toast = vi.spyOn(sonner, 'error');
    const client = createQueryClient({ retry: false });

    await client
      .getMutationCache()
      .build(client, { mutationFn: () => Promise.reject(new Error('boom')) })
      .execute(undefined)
      .catch(() => {});

    expect(toast).toHaveBeenCalledWith(resources.errors.title, { description: 'boom' });
  });

  it('leaves a mutation that renders its own error inline untoasted', async () => {
    const toast = vi.spyOn(sonner, 'error');
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

  it('leaves a query that renders its own error inline untoasted', async () => {
    const toast = vi.spyOn(sonner, 'error');
    const client = createQueryClient({ retry: false });

    await client
      .fetchQuery({
        queryKey: ['inline'],
        queryFn: () => Promise.reject(new Error('boom')),
        meta: { inlineError: true },
      })
      .catch(() => {});

    expect(toast).not.toHaveBeenCalled();
  });

  it('does not toast a query that succeeds', async () => {
    const toast = vi.spyOn(sonner, 'error');
    const client = createQueryClient({ retry: false });

    await client.fetchQuery({ queryKey: ['ok'], queryFn: () => Promise.resolve(1) });

    expect(toast).not.toHaveBeenCalled();
  });
});
