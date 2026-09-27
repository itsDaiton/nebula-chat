import { describe, expect, it, vi } from 'vitest';
import { notifyError } from '@/libs/api/utils/notifyError';
import { toaster } from '@/shared/components/ui/toaster';
import { resources } from '@/resources';

describe('notifyError', () => {
  it('toasts the error message', () => {
    const toast = vi.spyOn(toaster, 'create');

    notifyError(new Error('boom'));

    expect(toast).toHaveBeenCalledWith({
      type: 'error',
      title: resources.errors.title,
      description: 'boom',
    });
  });
});
