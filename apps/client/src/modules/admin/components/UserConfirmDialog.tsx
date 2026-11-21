import type { UserConfirmDialogProps } from '@/modules/admin/types/types';
import { resources } from '@/resources';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

export const UserConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pending,
  onConfirm,
}: UserConfirmDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent showCloseButton={false}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {resources.admin.users.actions.cancel}
        </Button>
        <Button loading={pending} onClick={onConfirm}>
          {pending ? resources.admin.users.actions.working : confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
