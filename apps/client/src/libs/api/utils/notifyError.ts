import { toast } from 'sonner';
import { resources } from '@/resources';

/** Toasts a failed query or mutation; its message is safe to show (see toAppError). */
export const notifyError = (error: Error) => {
  toast.error(resources.errors.title, { description: error.message });
};
