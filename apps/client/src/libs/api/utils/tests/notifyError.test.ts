import { toast as sonner } from 'sonner';
import { describe, expect, it, vi } from 'vitest';
import { notifyError } from '@/libs/api/utils/notifyError';
import { resources } from '@/resources';

describe('notifyError', () => {
  it('toasts the error message', () => {
    const toast = vi.spyOn(sonner, 'error');

    notifyError(new Error('boom'));

    expect(toast).toHaveBeenCalledWith(resources.errors.title, { description: 'boom' });
  });
});
