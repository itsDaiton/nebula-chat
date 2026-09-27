import { toaster } from '@/shared/components/ui/toaster';
import { resources } from '@/resources';

/** Toasts a failed query or mutation; its message is safe to show (see toAppError). */
export const notifyError = (error: Error) => {
  toaster.create({
    type: 'error',
    title: resources.errors.title,
    description: error.message,
  });
};
